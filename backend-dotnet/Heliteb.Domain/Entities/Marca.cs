namespace Heliteb.Domain.Entities;

public class Marca
{
    public int IdMarca { get; set; }
    public string Nombre { get; set; } = null!;
    public int? OdooPartnerId { get; set; }
}
