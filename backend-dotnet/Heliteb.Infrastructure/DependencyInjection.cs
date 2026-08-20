using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;
using Heliteb.Application.Asesores;
using Heliteb.Application.Auth;
using Heliteb.Application.Catalog;
using Heliteb.Application.Cotizaciones;
using Heliteb.Infrastructure.Asesores;
using Heliteb.Infrastructure.Auth;
using Heliteb.Infrastructure.Cotizaciones;
using Heliteb.Infrastructure.Data;
using Heliteb.Infrastructure.Data.Repositories;
using Heliteb.Infrastructure.Email;
using Heliteb.Infrastructure.Embeddings;
using Heliteb.Infrastructure.Llm;
using Heliteb.Infrastructure.Media;
using Heliteb.Infrastructure.Messaging;
using Heliteb.Infrastructure.Messaging.Kommo;
using Heliteb.Infrastructure.Monitoring;
using Heliteb.Infrastructure.Odoo;
using Heliteb.Infrastructure.Pdf;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Heliteb.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("Falta ConnectionStrings:Postgres en la configuración.");
        services.AddSingleton<INpgsqlConnectionFactory>(new NpgsqlConnectionFactory(connectionString));
        services.AddMemoryCache();

        services.AddScoped<IProductQueries, ProductRepository>();
        services.AddScoped<IAsesorRepository, AsesorRepository>();
        services.AddScoped<IConversationStore, ConversationRepository>();
        services.AddScoped<CotizacionRepository>();
        services.AddScoped<ICotizacionService, CotizacionService>();
        services.AddScoped<IAsesorAuthService, AsesorAuthService>();
        services.AddScoped<IAgentNotasRepository, AgentNotasRepository>();
        services.AddScoped<IPromptPersonaRepository, PromptPersonaRepository>();
        services.AddScoped<IInformacionEmpresaRepository, InformacionEmpresaRepository>();
        services.AddScoped<IAppConfigStore, AppConfigRepository>();
        services.AddScoped<IRecursosMuestraRepository, RecursosMuestraRepository>();
        services.AddSingleton<ISystemResourcesService, LinuxProcSystemResourcesService>();
        services.AddHostedService<RecursosSamplerBackgroundService>();
        services.AddScoped<IEmbeddingUsoRepository, EmbeddingUsoRepository>();

        var inventarioExternoOptions = configuration.GetSection("InventarioExterno").Get<InventarioExternoOptions>()
            ?? throw new InvalidOperationException("Falta la sección InventarioExterno en la configuración.");
        services.AddHttpClient(nameof(N8nInventarioExternoClient), http => http.Timeout = TimeSpan.FromSeconds(30));
        services.AddScoped<IInventarioExternoClient>(sp =>
        {
            var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(N8nInventarioExternoClient));
            return new N8nInventarioExternoClient(http, inventarioExternoOptions, sp.GetRequiredService<IMemoryCache>());
        });

        var jwtOptions = configuration.GetSection("Jwt").Get<JwtOptions>()
            ?? throw new InvalidOperationException("Falta la sección Jwt en la configuración.");
        services.AddSingleton(jwtOptions);
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();

        services.AddSingleton<IPdfService, QuestPdfService>();

        var cloudinaryOptions = configuration.GetSection("Cloudinary").Get<CloudinaryOptions>()
            ?? throw new InvalidOperationException("Falta la sección Cloudinary en la configuración.");
        services.AddSingleton(cloudinaryOptions);
        services.AddSingleton<ICloudinaryService, CloudinaryService>();

        var smtpOptions = configuration.GetSection("Smtp").Get<SmtpOptions>()
            ?? throw new InvalidOperationException("Falta la sección Smtp en la configuración.");
        services.AddSingleton(smtpOptions);
        // Scoped (no Singleton): ahora depende de IAppConfigStore (Scoped, usa una
        // conexión por request) para poder leer el override guardado desde el panel -
        // un Singleton no puede depender de un servicio Scoped sin quedar "cautivo".
        services.AddScoped<IEmailService, SmtpEmailService>();

        var deepSeekOptions = configuration.GetSection("DeepSeek").Get<DeepSeekOptions>()
            ?? throw new InvalidOperationException("Falta la sección DeepSeek en la configuración.");
        services.AddHttpClient(nameof(DeepSeekClient), http => http.Timeout = TimeSpan.FromSeconds(30));

        var groqOptions = configuration.GetSection("Groq").Get<GroqOptions>()
            ?? throw new InvalidOperationException("Falta la sección Groq en la configuración.");
        services.AddHttpClient(nameof(GroqClient), http => http.Timeout = TimeSpan.FromSeconds(30));

        // Registrados como tipos concretos (no solo detrás de ILlmClient), igual que
        // OllamaEmbeddingClient/GeminiEmbeddingClient más abajo — así el comparador
        // (ComparacionAgentFactory, LlmComparisonController) puede resolver los dos a
        // la vez sin importar cuál esté "activo" en ILlmProviderSwitch.
        services.AddScoped(sp => new DeepSeekClient(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(DeepSeekClient)), deepSeekOptions,
            sp.GetRequiredService<IAppConfigStore>(),
            sp.GetRequiredService<ILogger<DeepSeekClient>>()));
        services.AddScoped(sp => new GroqClient(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(GroqClient)), groqOptions,
            sp.GetRequiredService<IAppConfigStore>()));

        services.AddSingleton<ILlmProviderSwitch, LlmProviderSwitch>();
        services.AddScoped<ILlmClient>(sp => new LlmProviderRouter(
            sp.GetRequiredService<ILlmProviderSwitch>(),
            sp.GetRequiredService<DeepSeekClient>(),
            sp.GetRequiredService<GroqClient>()));

        var embeddingsOptions = configuration.GetSection("Embeddings").Get<EmbeddingsOptions>() ?? new EmbeddingsOptions();
        var odooOptions = configuration.GetSection("Odoo").Get<OdooOptions>() ?? new OdooOptions();
        services.AddSingleton(odooOptions);
        services.AddHttpClient(nameof(OdooXmlRpcClient), http => http.Timeout = TimeSpan.FromSeconds(30));
        // Scoped: OdooXmlRpcClient cachea el uid autenticado en un campo de instancia,
        // que solo debe vivir mientras dura un request (no compartir el uid entre
        // llamadas concurrentes de distintos clientes via un Singleton).
        services.AddScoped(sp => new OdooXmlRpcClient(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(OdooXmlRpcClient)), odooOptions));
        services.AddScoped<OdooVentasService>();

        services.AddSingleton(embeddingsOptions);
        // Scoped (no Singleton): depende de IAppConfigStore (Scoped) para persistir
        // el proveedor activo en app_config y que sobreviva a un reinicio de la API -
        // un Singleton no puede depender de un servicio Scoped sin quedar "cautivo",
        // mismo motivo por el que IEmailService es Scoped mas arriba. Se cambia desde
        // el panel (POST /api/embeddings/proveedor).
        services.AddScoped<IEmbeddingProviderSwitch, EmbeddingProviderSwitch>();

        var ollamaOptions = configuration.GetSection("Ollama").Get<OllamaOptions>() ?? new OllamaOptions();
        // 60s (no 30s) de margen: la primera consulta semantica tras un modelo recien
        // cargado en frio (sin GPU) puede tardar mas de 30s por si sola.
        services.AddHttpClient(nameof(OllamaEmbeddingClient), http => http.Timeout = TimeSpan.FromSeconds(60));

        var geminiOptions = configuration.GetSection("Gemini").Get<GeminiOptions>() ?? new GeminiOptions();
        services.AddHttpClient(nameof(GeminiEmbeddingClient), http => http.Timeout = TimeSpan.FromSeconds(30));

        // Registrados como tipos concretos (no solo detras de IEmbeddingClient) para que
        // EmbeddingsController pueda compararlos a los dos en la misma request (ver
        // POST /api/embeddings/comparar), sin importar cual este "activo" en el switch.
        services.AddScoped(sp => new OllamaEmbeddingClient(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(OllamaEmbeddingClient)), ollamaOptions,
            sp.GetRequiredService<IMemoryCache>(), sp.GetRequiredService<IEmbeddingUsoRepository>(),
            sp.GetRequiredService<ILogger<OllamaEmbeddingClient>>()));
        services.AddScoped(sp => new GeminiEmbeddingClient(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(GeminiEmbeddingClient)), geminiOptions,
            sp.GetRequiredService<IMemoryCache>(), sp.GetRequiredService<IEmbeddingUsoRepository>(),
            sp.GetRequiredService<IAppConfigStore>(), sp.GetRequiredService<ILogger<GeminiEmbeddingClient>>()));

        // Cual de los dos atiende cada llamada de busqueda en vivo lo decide
        // EmbeddingProviderRouter en tiempo real segun IEmbeddingProviderSwitch -
        // permite cambiar desde el panel sin reiniciar la API. Cada uno escribe su
        // propia columna (ver EmbeddingsOptions), asi que cambiar de proveedor nunca
        // pisa los embeddings ya generados del otro.
        services.AddScoped<IEmbeddingClient>(sp => new EmbeddingProviderRouter(
            sp.GetRequiredService<IEmbeddingProviderSwitch>(),
            sp.GetRequiredService<OllamaEmbeddingClient>(),
            sp.GetRequiredService<GeminiEmbeddingClient>()));

        // Foto/audio de WhatsApp que manda el cliente via Kommo: el link de adjunto
        // redirige varias veces hasta una URL firmada de Google Storage -
        // AllowAutoRedirect por defecto de HttpClient sigue la cadena solo, sin
        // necesitar ningun token de Kommo. Audio por Groq (Whisper), imagen por
        // Gemini (unico proveedor con vision confiable que se probo).
        services.AddHttpClient(nameof(GroqMediaInterpreter), http => http.Timeout = TimeSpan.FromSeconds(30));
        services.AddHttpClient(nameof(GeminiVisionClient), http => http.Timeout = TimeSpan.FromSeconds(30));
        services.AddScoped(sp => new GeminiVisionClient(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(GeminiVisionClient)), geminiOptions,
            sp.GetRequiredService<IAppConfigStore>()));
        services.AddScoped<IMediaInterpreter>(sp => new GroqMediaInterpreter(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(GroqMediaInterpreter)),
            sp.GetRequiredService<GroqClient>(),
            sp.GetRequiredService<GeminiVisionClient>(),
            sp.GetRequiredService<ILogger<GroqMediaInterpreter>>()));

        var inboxCrmOptions = configuration.GetSection("InboxCrm").Get<InboxCrmOptions>()
            ?? throw new InvalidOperationException("Falta la sección InboxCrm en la configuración.");
        services.AddHttpClient(nameof(InboxCrmWhatsAppSender));
        services.AddScoped<IWhatsAppSender>(sp =>
        {
            var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(InboxCrmWhatsAppSender));
            return new InboxCrmWhatsAppSender(http, inboxCrmOptions);
        });

        var kommoOptions = configuration.GetSection("Kommo").Get<KommoOptions>()
            ?? throw new InvalidOperationException("Falta la sección Kommo en la configuración.");
        services.AddSingleton(kommoOptions);
        services.AddHttpClient(nameof(KommoChatSender));
        services.AddScoped<IKommoChatSender>(sp =>
        {
            var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(KommoChatSender));
            return new KommoChatSender(http, kommoOptions);
        });
        services.AddHttpClient(nameof(KommoChannelConnector));
        services.AddScoped(sp =>
        {
            var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(KommoChannelConnector));
            return new KommoChannelConnector(http, kommoOptions);
        });

        return services;
    }
}
