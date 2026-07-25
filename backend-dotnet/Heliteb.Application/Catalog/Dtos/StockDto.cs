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
}
