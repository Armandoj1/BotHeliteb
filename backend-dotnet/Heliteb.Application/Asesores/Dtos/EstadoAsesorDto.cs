namespace Heliteb.Application.Asesores.Dtos;

public class EstadoAsesorDto
{
    public bool Registrado { get; set; }
    public bool Verificado { get; set; }
    public string? Nombre { get; set; }
}

public class VerificarCodigoResultDto
{
    public bool Ok { get; set; }
    public string? Nombre { get; set; }
    public string? Motivo { get; set; }
}
