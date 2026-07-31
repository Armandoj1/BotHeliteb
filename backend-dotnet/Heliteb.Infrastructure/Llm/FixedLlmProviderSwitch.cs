using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Llm;

/// <summary>
/// Versión "pineada" de ILlmProviderSwitch para las conversaciones aisladas del
/// comparador (ver ComparacionAgentFactory). Sin esto, el comando de prueba manual
/// "cambia a groq" escrito dentro de un chat de comparación llamaría al switch
/// GLOBAL compartido (ver AgentOrchestrator) y cambiaría el LLM que responde a
/// clientes reales por WhatsApp — exactamente el mismo problema que
/// FixedEmbeddingProviderSwitch ya resuelve para embeddings.
/// </summary>
public class FixedLlmProviderSwitch : ILlmProviderSwitch
{
    public FixedLlmProviderSwitch(string proveedor)
    {
        Current = proveedor;
    }

    public string Current { get; }

    public void SwitchTo(string provider) =>
        throw new InvalidOperationException("Este switch está pineado a un solo proveedor, no se puede cambiar.");
}
