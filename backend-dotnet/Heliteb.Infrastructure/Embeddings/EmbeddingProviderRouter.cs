using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Embeddings;

/// <summary>
/// IEmbeddingClient real inyectado en ProductRepository/EmbeddingsController: delega
/// a Ollama o Gemini según IEmbeddingProviderSwitch, evaluado en cada llamada (no al
/// arrancar la API) - mismo patrón que LlmProviderRouter para DeepSeek/Groq. Así el
/// switch del panel cambia el comportamiento sin reiniciar nada.
/// </summary>
public class EmbeddingProviderRouter : IEmbeddingClient
{
    private readonly IEmbeddingProviderSwitch _switch;
    private readonly OllamaEmbeddingClient _ollama;
    private readonly GeminiEmbeddingClient _gemini;

    public EmbeddingProviderRouter(IEmbeddingProviderSwitch @switch, OllamaEmbeddingClient ollama, GeminiEmbeddingClient gemini)
    {
        _switch = @switch;
        _ollama = ollama;
        _gemini = gemini;
    }

    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        IEmbeddingClient activo = _switch.Current.Equals("gemini", StringComparison.OrdinalIgnoreCase) ? _gemini : _ollama;
        return activo.EmbedAsync(text, ct);
    }
}
