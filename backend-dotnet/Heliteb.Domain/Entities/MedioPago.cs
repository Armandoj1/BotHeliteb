namespace Heliteb.Domain.Entities;

public class MedioPago
{
    public int Id { get; set; }
    public string Medio { get; set; } = null!;
    public string? Canal { get; set; }
    public string? Observacion { get; set; }
    public string? Validacion { get; set; }
}
