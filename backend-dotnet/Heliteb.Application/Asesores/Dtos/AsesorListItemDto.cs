namespace Heliteb.Application.Asesores.Dtos;

/// <summary>Fila del listado de asesores para el panel, con el estado de verificación real (join a asesor_auth).</summary>
public class AsesorListItemDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Telefono { get; set; } = null!;
    public bool Activo { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool Verificado { get; set; }
}
