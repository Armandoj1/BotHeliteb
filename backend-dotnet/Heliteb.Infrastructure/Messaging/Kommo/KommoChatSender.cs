using System.Text.Json;
using System.Text.Json.Serialization;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Messaging.Kommo;

/// <summary>
/// Empuja mensajes al canal de chat privado de Kommo (Chats API: POST
/// /v2/origin/custom/{scope_id}), firmando cada request con HMAC-SHA1 sobre la
/// cadena canónica "POST\n{Content-MD5}\n{Content-Type}\n{Date}\n{path}", igual
/// que exige el esquema de Kommo/amoCRM para canales custom.
///
/// OJO: los nombres de campo dentro de KommoMessagePayload (sender/message/etc.)
/// están armados según la referencia pública de la Chats API — Kommo no expone esta
/// doc sin cuenta de desarrollador y el shape puede tener matices por versión.
/// Verificar contra la respuesta real la primera vez que se pruebe con una cuenta
/// Kommo real y ajustar acá (un solo archivo) si hace falta.
/// </summary>
public class KommoChatSender : IKommoChatSender
{
    private const string BotSenderId = "heliteb-bot";

    private readonly HttpClient _http;
    private readonly KommoOptions _options;
    private static readonly JsonSerializerOptions JsonOptions = new() { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };

    public KommoChatSender(HttpClient http, KommoOptions options)
    {
        _http = http;
        _options = options;
        _http.BaseAddress = new Uri(_options.BaseUrl);
    }

    public Task PushInboundMessageAsync(string telefono, string? contactName, string body, CancellationToken ct = default)
    {
        var sender = new KommoParty(ConversationIdFor(telefono), contactName ?? telefono, telefono);
        return SendMessageAsync(telefono, sender, body, ct);
    }

    public Task PushOutboundMessageAsync(string telefono, string? contactName, string body, CancellationToken ct = default)
    {
        var sender = new KommoParty(BotSenderId, "HELITEB Bot", null);
        return SendMessageAsync(telefono, sender, body, ct);
    }

    private async Task SendMessageAsync(string telefono, KommoParty sender, string body, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var envelope = new KommoEnvelope(
            EventType: "new_message",
            Payload: new KommoMessagePayload(
                Timestamp: now.ToUnixTimeSeconds(),
                MsecTimestamp: now.ToUnixTimeMilliseconds(),
                MsgId: Guid.NewGuid().ToString(),
                ConversationId: ConversationIdFor(telefono),
                Sender: sender,
                Message: new KommoMessageBody("text", body),
                Silent: false));

        var path = $"/v2/origin/custom/{_options.ScopeId}";
        var json = JsonSerializer.Serialize(envelope, JsonOptions);

        using var request = KommoRequestSigner.BuildSignedPost(path, json, _options.ChannelSecret);
        var response = await _http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    private static string ConversationIdFor(string telefono) => $"whatsapp-{telefono}";

    private record KommoEnvelope(
        [property: JsonPropertyName("event_type")] string EventType,
        [property: JsonPropertyName("payload")] KommoMessagePayload Payload);

    private record KommoMessagePayload(
        [property: JsonPropertyName("timestamp")] long Timestamp,
        [property: JsonPropertyName("msec_timestamp")] long MsecTimestamp,
        [property: JsonPropertyName("msgid")] string MsgId,
        [property: JsonPropertyName("conversation_id")] string ConversationId,
        [property: JsonPropertyName("sender")] KommoParty Sender,
        [property: JsonPropertyName("message")] KommoMessageBody Message,
        [property: JsonPropertyName("silent")] bool Silent);

    private record KommoParty(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("phone")] string? Phone);

    private record KommoMessageBody(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("text")] string Text);
}
