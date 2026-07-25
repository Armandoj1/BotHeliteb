namespace Heliteb.Domain.Entities;

public class Bodega
{
    public int IdBodega { get; set; }
    public string CodigoBodega { get; set; } = null!;
    public string NombreSucursal { get; set; } = null!;
    public string? Ciudad { get; set; }
    public bool Activo { get; set; } = true;
    public int? OdooWarehouseId { get; set; }
    public int? OdooLocationId { get; set; }
}
