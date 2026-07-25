namespace Heliteb.Domain.Entities;

public class AsesorSede
{
    public int Id { get; set; }
    public int SedeId { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Cargo { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public string SedeCiudad { get; set; } = null!;
    public string SedeDireccion { get; set; } = null!;
}
