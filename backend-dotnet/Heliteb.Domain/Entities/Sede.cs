namespace Heliteb.Domain.Entities;

public class Sede
{
    public int Id { get; set; }
    public string Ciudad { get; set; } = null!;
    public string Direccion { get; set; } = null!;
    public string? Telefono { get; set; }
}
