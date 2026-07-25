namespace Heliteb.Domain.Entities;

public class Asesor
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Telefono { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
