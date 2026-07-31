namespace Heliteb.Application.Abstractions;

/// <summary>
/// Estado en memoria (no persistido, se resetea al reiniciar la API) de qué
/// proveedor de embeddings está activo ("ollama" | "gemini"). Se cambia desde el
/// panel (sección "Uso de IA") para comparar ambos sin necesitar redeploy - mismo
/// patrón que ILlmProviderSwitch para DeepSeek/Groq.
/// </summary>
public interface IEmbeddingProviderSwitch
{
    string Current { get; }
    void SwitchTo(string provider);
}
