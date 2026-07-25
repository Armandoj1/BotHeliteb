namespace Heliteb.Application.Abstractions;

public class InventarioExternoItem
{
    public int Id { get; set; }
    /// <summary>Texto crudo de la columna "producto" - a veces trae "[MODELO] descripcion", a veces solo texto libre.</summary>
    public string ProductoRaw { get; set; } = null!;
    /// <summary>Codigo de modelo extraido de entre corchetes (o el texto completo si no hay corchetes).</summary>
    public string ModeloParsed { get; set; } = null!;
    public string Almacen { get; set; } = null!;
    public int StockActual { get; set; }
    public string? Tendencia { get; set; }
}

/// <summary>
/// Stock por sede desde la base de datos externa "BD Heliteb" (tabla inventario_heliteb,
/// solo alcanzable hoy desde n8n - no hay conexion directa desde este backend). Reemplaza
/// el stock por bodega que antes salia de la tabla local "inventario": esta fuente no
/// tiene codigo SAP, la busqueda es por texto de modelo.
/// </summary>
public interface IInventarioExternoClient
{
    Task<IReadOnlyList<InventarioExternoItem>> ListarAsync(CancellationToken ct = default);
}
