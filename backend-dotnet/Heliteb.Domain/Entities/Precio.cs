namespace Heliteb.Domain.Entities;

public class Precio
{
    public int IdPrecio { get; set; }
    public string CodigoSap { get; set; } = null!;
    public decimal PrecioMsrpCop { get; set; }
    public int? OdooPricelistId { get; set; }
    public DateTime FechaActualizacion { get; set; }
}
