using System.Text.Json;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Embeddings;

public class EmbeddingProviderSwitch : IEmbeddingProviderSwitch
{
    // Misma clave para siempre: si cambia, el valor guardado hoy deja de leerse y
    // el sistema vuelve a caer en el default de appsettings.json sin avisar.
    private const string Clave = "embeddings:proveedor";

    private readonly IAppConfigStore _appConfig;
    private string _current;

    // Scoped (no Singleton, ver DependencyInjection.cs): lee el override guardado en
    // app_config en cada request, igual que SmtpEmailService con "smtp" - asi el
    // proveedor activo sobrevive a un reinicio de la API en vez de resetearse en
    // silencio al default de appsettings.json cada vez que se redespliega.
    public EmbeddingProviderSwitch(EmbeddingsOptions options, IAppConfigStore appConfig)
    {
        _appConfig = appConfig;
        var guardado = _appConfig.GetAsync(Clave).GetAwaiter().GetResult();
        _current = string.IsNullOrWhiteSpace(guardado)
            ? options.Provider
            : JsonSerializer.Deserialize<string>(guardado) ?? options.Provider;
    }

    public string Current => _current;

    public void SwitchTo(string provider)
    {
        _current = provider;
        // Bloqueante deliberado: quien llama al endpoint del panel espera
        // confirmacion de que el cambio quedo guardado, no solo en memoria de esta
        // instancia - un fire-and-forget aqui podria reportar exito y perder el
        // cambio si la API se cae justo despues de responder.
        _appConfig.SetAsync(Clave, JsonSerializer.Serialize(provider)).GetAwaiter().GetResult();
    }
}
