namespace Heliteb.Domain.Entities;

public class ConversationSession
{
    public string Telefono { get; set; } = null!;
    public int Generacion { get; set; }
    public DateTime UltimoMensajeEn { get; set; }
}
