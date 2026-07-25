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
using Heliteb.Infrastructure.Pdf;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

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
        services.AddScoped<IInformacionEmpresaRepository, InformacionEmpresaRepository>();
        services.AddScoped<IAppConfigStore, AppConfigRepository>();
        services.AddScoped<IRecursosMuestraRepository, RecursosMuestraRepository>();
        services.AddSingleton<ISystemResourcesService, LinuxProcSystemResourcesService>();
        services.AddHostedService<RecursosSamplerBackgroundService>();

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

        services.AddSingleton<ILlmProviderSwitch, LlmProviderSwitch>();
        services.AddScoped<ILlmClient>(sp =>
        {
            var factory = sp.GetRequiredService<IHttpClientFactory>();
            var deepSeek = new DeepSeekClient(factory.CreateClient(nameof(DeepSeekClient)), deepSeekOptions);
            var groq = new GroqClient(factory.CreateClient(nameof(GroqClient)), groqOptions);
            return new LlmProviderRouter(sp.GetRequiredService<ILlmProviderSwitch>(), deepSeek, groq);
        });

        var ollamaOptions = configuration.GetSection("Ollama").Get<OllamaOptions>() ?? new OllamaOptions();
        // 60s (no 30s) de margen: la primera consulta semantica tras un modelo recien
        // cargado en frio (sin GPU) puede tardar mas de 30s por si sola.
        services.AddHttpClient(nameof(OllamaEmbeddingClient), http => http.Timeout = TimeSpan.FromSeconds(60));
        services.AddScoped<IEmbeddingClient>(sp =>
        {
            var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(OllamaEmbeddingClient));
            return new OllamaEmbeddingClient(http, ollamaOptions, sp.GetRequiredService<IMemoryCache>());
        });

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
