using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Embeddings;

/// <summary>
/// Identifica que producto aparece en una foto que mando el cliente, para que el
/// agente (que solo entiende texto) pueda usar esa descripcion como si el cliente
/// la hubiera escrito. Reutiliza GeminiOptions/el mismo API key que
/// GeminiEmbeddingClient (misma cuenta de Gemini, dos usos distintos) - probado en
/// vivo el 2026-08-20, gemini-3.6-flash identifica marca/tipo con buena precision.
/// </summary>
public class GeminiVisionClient
{
    private const string ConfigKey = "gemini";
    private const string VisionModel = "gemini-3.6-flash";

    private const string PromptDescripcionImagen =
        "Describe en español, en 2-3 frases cortas, que producto de videovigilancia/seguridad " +
        "aparece en esta imagen (tipo de camara -domo/bala/PTZ/etc-, color, marca o modelo si se " +
        "alcanza a leer en la caja o el empaque, y cualquier texto visible). Si la imagen NO es de " +
        "un producto de este rubro (ej. es una foto de un espacio, una factura, una captura de " +
        "pantalla), dilo tal cual y describe brevemente que es. No inventes marca ni modelo si no " +
        "se ve con claridad - en ese caso di solo lo que sí se distingue (tipo, color, forma).";

    private readonly HttpClient _http;
    private readonly GeminiOptions _options;
    private readonly IAppConfigStore _configStore;

    public GeminiVisionClient(HttpClient http, GeminiOptions options, IAppConfigStore configStore)
    {
        _http = http;
        _options = options;
        _configStore = configStore;
    }

    public async Task<string> DescribirImagenAsync(byte[] imagenBytes, string mimeType, CancellationToken ct = default)
    {
        var apiKey = await ResolveApiKeyAsync(ct);
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Equals("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("La API key de Gemini no está configurada.");
        }

        var base64 = Convert.ToBase64String(imagenBytes);
        var payload = new JsonObject
        {
            ["contents"] = new JsonArray
            {
                new JsonObject
                {
                    ["parts"] = new JsonArray
                    {
                        new JsonObject { ["text"] = PromptDescripcionImagen },
                        new JsonObject
                        {
                            ["inline_data"] = new JsonObject { ["mime_type"] = mimeType, ["data"] = base64 },
                        },
                    },
                },
            },
        };

        var url = $"{_options.BaseUrl.TrimEnd('/')}/v1beta/models/{VisionModel}:generateContent?key={apiKey}";
        using var response = await _http.PostAsJsonAsync(url, payload, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"Gemini vision {(int)response.StatusCode}: {errorBody}");
        }

        var body = await response.Content.ReadFromJsonAsync<JsonNode>(cancellationToken: ct);
        var partes = body!["candidates"]![0]!["content"]!["parts"]!.AsArray();
        // El modelo a veces manda una primera "parte" de razonamiento interno (sin
        // "text" visible) antes del texto real - se toma la primera parte que SI
        // trae texto, no automaticamente la [0].
        foreach (var parte in partes)
        {
            var texto = parte?["text"]?.GetValue<string>();
            if (!string.IsNullOrWhiteSpace(texto))
            {
                return texto.Trim();
            }
        }

        return string.Empty;
    }

    private async Task<string> ResolveApiKeyAsync(CancellationToken ct)
    {
        var overrideJson = await _configStore.GetAsync(ConfigKey, ct);
        if (string.IsNullOrWhiteSpace(overrideJson)) return _options.ApiKey;

        try
        {
            var stored = JsonSerializer.Deserialize<GeminiConfigJsonVision>(overrideJson);
            return !string.IsNullOrWhiteSpace(stored?.ApiKey) ? stored.ApiKey : _options.ApiKey;
        }
        catch (JsonException)
        {
            return _options.ApiKey;
        }
    }

    private class GeminiConfigJsonVision
    {
        [JsonPropertyName("api_key")] public string? ApiKey { get; set; }
    }
}
