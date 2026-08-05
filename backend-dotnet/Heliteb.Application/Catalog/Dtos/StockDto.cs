namespace Heliteb.Application.Catalog.Dtos;

public class StockDto
{
    public string CodigoSap { get; set; } = null!;
    public string Marca { get; set; } = null!;
    public string Modelo { get; set; } = null!;
    public string CodigoBodega { get; set; } = null!;
    public string NombreSucursal { get; set; } = null!;
    public string? Ciudad { get; set; }
    public int CantidadDisponible { get; set; }
    public decimal? PrecioMsrpCop { get; set; }

    /// <summary>'sede' (mostrador, entrega inmediata) o 'central' (requiere traslado).</summary>
    public string? TipoBodega { get; set; }

    /// <summary>FALSE si el inventario no distingue esta variante de lente de sus hermanas.</summary>
    public bool VarianteExacta { get; set; } = true;
}
