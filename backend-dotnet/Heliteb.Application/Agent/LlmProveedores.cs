namespace Heliteb.Application.Agent;

/// <summary>
/// Proveedores de LLM que el backend puede ejecutar (ver ILlmClient), en el mismo
/// espíritu que EmbeddingsOptions.ProveedoresValidos para embeddings — un solo lugar
/// para validar tanto en el switch de producción como en el comparador.
/// </summary>
public static class LlmProveedores
{
    public static readonly string[] ProveedoresValidos = ["deepseek", "groq"];
}
