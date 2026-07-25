namespace Heliteb.Domain.Entities;

public class ConversationMessage
{
    public long Id { get; set; }
    public string Telefono { get; set; } = null!;
    public int Generacion { get; set; }
    public string Role { get; set; } = null!; // user | assistant | tool
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
