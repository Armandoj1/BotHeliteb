using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Embeddings;

public class EmbeddingProviderSwitch : IEmbeddingProviderSwitch
{
    // Arranca en lo que diga Embeddings:Provider en appsettings.json/.env (default
    // "ollama") - cambiarlo desde el panel no toca esa config, solo dura hasta el
    // proximo reinicio de la API, igual que LlmProviderSwitch.
    private volatile string _current;

    public EmbeddingProviderSwitch(EmbeddingsOptions options)
    {
        _current = options.Provider;
    }

    public string Current => _current;

    public void SwitchTo(string provider) => _current = provider;
}
