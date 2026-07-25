namespace Heliteb.Infrastructure.Messaging.Kommo;

public class KommoOptions
{
    public string BaseUrl { get; set; } = "https://amojo.kommo.com";

    /// <summary>Channel ID que Kommo asigna al crear la integración privada (scope "chats").</summary>
    public string ChannelId { get; set; } = null!;

    /// <summary>Secreto del canal, usado para firmar cada request (HMAC-SHA1). Nunca hardcodear: viene de KOMMO_CHANNEL_SECRET.</summary>
    public string ChannelSecret { get; set; } = null!;

    /// <summary>ID de la cuenta de Kommo del negocio (visible en Ajustes de la cuenta).</summary>
    public string AccountId { get; set; } = null!;

    /// <summary>
    /// Se obtiene una sola vez llamando a POST /v2/origin/custom/{ChannelId}/connect
    /// (ver KommoChannelConnector) y queda fijo mientras el canal siga conectado a la cuenta.
    /// </summary>
    public string ScopeId { get; set; } = null!;
}
