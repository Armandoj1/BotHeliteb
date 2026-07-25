namespace Heliteb.Application.Catalog.Dtos;

public class ProductoDto
{
    public string CodigoSap { get; set; } = null!;
    public string Marca { get; set; } = null!;
    public string Categoria { get; set; } = null!;
    public string? Linea { get; set; }
    public string? Serie { get; set; }
    public string? SubSerie { get; set; }
    public string Modelo { get; set; } = null!;
    public string? Parametro1 { get; set; }
    public string? Parametro2 { get; set; }
    public string? Parametro3 { get; set; }
    public string? Descripcion { get; set; }
    public string? ModeloEtiqueta { get; set; }
    public decimal? PrecioMsrpCop { get; set; }
    public int StockTotal { get; set; }
    public string ImagenUrl { get; set; } = null!;

    /// <summary>Desglose por bodega/sucursal, para el panel (ver Product Drawer). Vacío si no hay stock.</summary>
    public List<StockDto> StockBodegas { get; set; } = new();
}
