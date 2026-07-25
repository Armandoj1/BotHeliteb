namespace Heliteb.Domain.Entities;

public class ContactoEmpresa
{
    public int Id { get; set; }
    public string Area { get; set; } = null!;
    public string? Cargo { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public string? Nota { get; set; }
}
