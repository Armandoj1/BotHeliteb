namespace Heliteb.Application.Abstractions;

/// <summary>
/// Genera embeddings semánticos multilingües (ES/EN) para búsqueda de catálogo.
/// El catálogo mezcla descripciones en inglés (HIKVISION) y español (EZVIZ); una
/// búsqueda por palabras clave nunca cruza ambos idiomas, pero un embedding
/// multilingüe sí acerca "domo" y "dome" en el espacio vectorial.
/// </summary>
public interface IEmbeddingClient
{
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
}
