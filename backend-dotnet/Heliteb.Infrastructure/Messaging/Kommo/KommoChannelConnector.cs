using System.Text.Json;
using System.Text.Json.Serialization;

namespace Heliteb.Infrastructure.Messaging.Kommo;

/// <summary>
/// Hace, una sola vez por cuenta de Kommo, el POST /v2/origin/custom/{channel_id}/connect
/// que vincula el canal privado (ChannelId/ChannelSecret) a la cuenta del negocio
/// (AccountId) y devuelve el scope_id que después usa KommoChatSender para enviar
/// mensajes. Se expone vía POST /api/kommo/connect (KommoAdminController) para no
/// tener que armar el request firmado a mano.
/// </summary>
public class KommoChannelConnector
{
    private readonly HttpClient _http;
    private readonly KommoOptions _options;

    public KommoChannelConnector(HttpClient http, KommoOptions options)
    {
        _http = http;
        _options = options;
        _http.BaseAddress = new Uri(_options.BaseUrl);
    }

    public async Task<string> ConnectAsync(CancellationToken ct = default)
    {
        var path = $"/v2/origin/custom/{_options.ChannelId}/connect";
        var body = new ConnectRequest(_options.AccountId, "HELITEB Bot", "v2");
        var json = JsonSerializer.Serialize(body);

        using var request = KommoRequestSigner.BuildSignedPost(path, json, _options.ChannelSecret);
        var response = await _http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync(ct);
        var parsed = JsonSerializer.Deserialize<ConnectResponse>(responseJson)
            ?? throw new InvalidOperationException("Kommo no devolvió un scope_id en la respuesta de connect.");

        return parsed.ScopeId;
    }

    private record ConnectRequest(
        [property: JsonPropertyName("account_id")] string AccountId,
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("hook_api_version")] string HookApiVersion);

    private record ConnectResponse(
        [property: JsonPropertyName("scope_id")] string ScopeId);
}
