namespace Heliteb.Domain.Entities;

public class Asesor
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Telefono { get; set; } = null!;
    /// <summary>PBKDF2 serializado; NULL mientras el asesor no tenga acceso al panel.</summary>
    public string? PasswordHash { get; set; }

    /// <summary>"admin" puede crear/borrar asesores; "asesor" es el rol por defecto.</summary>
    public string Rol { get; set; } = "asesor";

    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
