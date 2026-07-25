namespace Heliteb.Application.Catalog;

/// <summary>
/// Filtros estructurados que el LLM extrae de la pregunta del cliente. La búsqueda
/// semántica pura no entiende criterios numéricos/exactos ("4 canales", "económico",
/// "solo DVR") — estos filtros se resuelven como SQL exacto, y el texto libre queda
/// solo para lo genuinamente semántico (uso, ambiente, características descriptivas).
/// </summary>
public sealed record ProductoFiltros
{
    /// <summary>dvr | nvr | camara | switch | disco_duro | accesorio</summary>
    public string? TipoProducto { get; init; }

    /// <summary>Cantidad exacta de canales (solo aplica a DVR/NVR).</summary>
    public int? Canales { get; init; }

    /// <summary>Resolución en megapíxeles pedida explícitamente.</summary>
    public int? ResolucionMp { get; init; }

    /// <summary>
    /// wifi | ip | analoga (solo aplica a cámaras). Sin este filtro, "económica"/"barata"
    /// (OrdenarPor) ordena por precio entre TODAS las cámaras sin importar conexión, y
    /// puede devolver una análoga cuando el cliente pidió explícitamente inalámbrica/WiFi.
    /// </summary>
    public string? Tecnologia { get; init; }

    /// <summary>precio_asc | precio_desc. Null = por relevancia semántica.</summary>
    public string? OrdenarPor { get; init; }

    public bool TieneFiltrosEstructurados =>
        TipoProducto is not null || Canales is not null || ResolucionMp is not null || Tecnologia is not null || OrdenarPor is not null;
}
