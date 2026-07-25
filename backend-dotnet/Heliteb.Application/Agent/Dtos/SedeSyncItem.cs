namespace Heliteb.Application.Agent.Dtos;

/// <summary>Una fila del Sheet de sedes tal como llega desde n8n.</summary>
public class SedeSyncItem
{
    public string Ciudad { get; set; } = null!;
    public string Direccion { get; set; } = null!;
    public string? Telefono { get; set; }
}
