namespace Heliteb.Domain.Entities;

public class Inventario
{
    public int IdInventario { get; set; }
    public string CodigoSap { get; set; } = null!;
    public int IdBodega { get; set; }
    public int CantidadDisponible { get; set; }
    public int? OdooQuantId { get; set; }
    public DateTime FechaActualizacion { get; set; }
}
