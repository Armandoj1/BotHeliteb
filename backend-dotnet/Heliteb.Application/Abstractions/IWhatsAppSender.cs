namespace Heliteb.Application.Abstractions;

/// <summary>
/// Sends outbound WhatsApp messages through InboxCRM's existing external-send
/// contract (POST /api/send, header X-Api-Key). InboxCRM itself is not modified.
/// </summary>
public interface IWhatsAppSender
{
    /// <param name="channel">null/"whatsapp" (por defecto) o "telegram" — decide qué canal usa InboxCRM para la entrega.</param>
    Task SendAsync(string to, string body, string? contactName = null, string? channel = null, CancellationToken ct = default);

    Task SendMediaAsync(string to, string body, string mediaUrl, string fileName, string? channel = null, CancellationToken ct = default);
}
