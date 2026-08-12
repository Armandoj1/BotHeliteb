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

    /// <summary>
    /// Canal al que aplica la nota: "whatsapp" (cliente final por WhatsApp/CRM),
    /// "escritorio" (asesor en el panel) o null para los dos. Permite afinar al
    /// vendedor sin cambiarle el comportamiento al asistente interno.
    /// </summary>
    public string? Canal { get; set; }
    public DateTime CreatedAt { get; set; }
}
