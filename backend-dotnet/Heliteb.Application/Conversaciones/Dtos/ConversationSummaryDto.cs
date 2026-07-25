namespace Heliteb.Application.Conversaciones.Dtos;

/// <summary>Fila del listado de conversaciones (inbox) para el panel: una por teléfono, con preview del último mensaje.</summary>
public class ConversationSummaryDto
{
    public string Telefono { get; set; } = null!;
    public string? NombreContacto { get; set; }
    public DateTime UltimoMensajeEn { get; set; }
    public string? UltimoMensajePreview { get; set; }
    public string? UltimoMensajeRole { get; set; }
    public int TotalMensajes { get; set; }
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
}
