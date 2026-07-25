namespace Heliteb.Domain.Entities;

public class AsesorAuth
{
    public string Telefono { get; set; } = null!;
    public int? AsesorId { get; set; }
    public string? Codigo { get; set; }
    public DateTime? CodigoExpira { get; set; }
    public int Intentos { get; set; }
    public DateTime? VerificadoHasta { get; set; }
}
