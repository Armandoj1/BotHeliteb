namespace Heliteb.Application.Abstractions;

/// <summary>
/// Espeja la conversación de WhatsApp/Telegram hacia el inbox de chats de Kommo
/// (canal adicional de solo visibilidad/handoff, no reemplaza a InboxCRM). Un fallo
/// acá nunca debe frenar la entrega real del mensaje al cliente — el llamador debe
/// envolver estas llamadas en su propio try/catch, igual que ya hace con IWhatsAppSender.
/// </summary>
public interface IKommoChatSender
{
    Task PushInboundMessageAsync(string telefono, string? contactName, string body, CancellationToken ct = default);

    Task PushOutboundMessageAsync(string telefono, string? contactName, string body, CancellationToken ct = default);
}
