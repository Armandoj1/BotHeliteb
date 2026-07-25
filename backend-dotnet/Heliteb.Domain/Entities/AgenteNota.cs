namespace Heliteb.Domain.Entities;

/// <summary>
/// Nota/regla de negocio editable sin tocar código, inyectada en el system prompt
/// del agente en cada turno de conversación.
/// </summary>
public class AgenteNota
{
    public int Id { get; set; }
    public string Contenido { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
