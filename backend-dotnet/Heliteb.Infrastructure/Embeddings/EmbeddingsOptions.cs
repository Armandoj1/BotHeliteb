namespace Heliteb.Infrastructure.Embeddings;

/// <summary>
/// Que proveedor de embeddings esta activo para busqueda semantica (Embeddings:Provider
/// en appsettings.json). "ollama" y "gemini" escriben/leen su propia columna en
/// productos (embedding / embedding_gemini) para poder tener ambos indexados a la vez
/// y comparar cual da mejores resultados de busqueda antes de decidir cual usar en
/// produccion - ver ProductRepository y EmbeddingsController.
/// </summary>
public class EmbeddingsOptions
{
    // Valor con el que arranca la API (ver EmbeddingProviderSwitch) - cambiar el
    // proveedor desde el panel no modifica esto, solo el estado en memoria.
    public string Provider { get; set; } = "ollama";

    public static readonly string[] ProveedoresValidos = ["ollama", "gemini"];

    public static string ColumnaPara(string provider) =>
        provider.Equals("gemini", StringComparison.OrdinalIgnoreCase) ? "embedding_gemini" : "embedding";
}
