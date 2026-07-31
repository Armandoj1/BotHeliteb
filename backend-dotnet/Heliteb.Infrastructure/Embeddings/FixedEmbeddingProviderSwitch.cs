using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Embeddings;

/// <summary>
/// Version "pineada" de IEmbeddingProviderSwitch para armar un ProductRepository
/// aislado que SIEMPRE usa un proveedor especifico, sin tocar el switch global
/// compartido (ese sigue decidiendo solo la busqueda semantica en vivo del bot de
/// WhatsApp). Se usa en la comparacion de chat completo (ver ComparacionAgentFactory)
/// para poder correr Ollama y Gemini a la vez sin que se pisen entre si ni con
/// trafico real concurrente.
/// </summary>
public class FixedEmbeddingProviderSwitch : IEmbeddingProviderSwitch
{
    public FixedEmbeddingProviderSwitch(string proveedor)
    {
        Current = proveedor;
    }

    public string Current { get; }

    public void SwitchTo(string provider) =>
        throw new InvalidOperationException("Este switch esta pineado a un solo proveedor, no se puede cambiar.");
}
