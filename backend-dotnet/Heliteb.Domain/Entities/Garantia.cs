namespace Heliteb.Domain.Entities;

public class Garantia
{
    public int Id { get; set; }
    public string Familia { get; set; } = null!;
    public string Marca { get; set; } = null!;
    public string TipoProducto { get; set; } = null!;
    public int? Meses { get; set; }
    public string? Observacion { get; set; }
}
