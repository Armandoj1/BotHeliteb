using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Llm;

public class GroqOptions
{
    // Valor con el que arranca la API si nunca se guardó nada desde el panel (ver
    // ResolveApiKeyAsync) - una vez que alguien la guarda ahí, esta queda ignorada.
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.groq.com/openai/v1";
    // openai/gpt-oss-120b es el que ya probamos en n8n con tool-calling nativo
    // confiable. Evitar openai/gpt-oss-safeguard-20b (moderación, rompe tool
    // calls) y llama-3.3-70b-versatile (emite texto <function=...> que no
    // parsea como tool call real).
    public string Model { get; set; } = "openai/gpt-oss-120b";
    public double Temperature { get; set; } = 0.3;
    public int MaxTokens { get; set; } = 2048;
}

/// <summary>Forma del JSON guardado en app_config.clave='groq'.</summary>
internal class GroqConfigJson
{
    [JsonPropertyName("api_key")] public string? ApiKey { get; set; }
}

/// <summary>
/// Cliente para la API de Groq — mismo formato "chat completions" compatible con
/// OpenAI que DeepSeek, incluyendo tool calling nativo. El tier gratuito de Groq
/// tiene un límite de tokens/minuto ajustado (TPM=8000): en conversaciones largas
/// o que encadenan varias herramientas puede devolver 429 antes que DeepSeek.
/// </summary>
public class GroqClient : ILlmClient
{
    private const string ConfigKey = "groq";

    private readonly HttpClient _http;
    private readonly GroqOptions _options;
    private readonly IAppConfigStore _configStore;

    public GroqClient(HttpClient http, GroqOptions options, IAppConfigStore configStore)
    {
        _http = http;
        _options = options;
        _configStore = configStore;
        // Uri con base termina en '/' para que el path relativo sin '/' inicial se
        // ANEXE al path del host en vez de reemplazarlo (regla de composición de Uri).
        _http.BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/");
    }

    public async Task<LlmCompletion> CompleteAsync(
        IReadOnlyList<LlmMessage> messages,
        IReadOnlyList<LlmToolDefinition> tools,
        CancellationToken ct = default)
    {
        var apiKey = await ResolveApiKeyAsync(ct);
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Equals("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "La API key de Groq no está configurada. Guárdala en 'Uso de IA' → Credenciales de Groq, en el panel.");
        }

        var payload = new JsonObject
        {
            ["model"] = _options.Model,
            ["temperature"] = _options.Temperature,
            ["max_tokens"] = _options.MaxTokens,
            ["messages"] = BuildMessagesArray(messages),
        };

        if (tools.Count > 0)
        {
            payload["tools"] = BuildToolsArray(tools);
        }

        // OJO: HttpClient.BaseAddress con path ("/openai/v1") se pisa por completo si
        // el path relativo empieza con "/" — por eso va sin slash inicial aquí.
        using var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"Groq {(int)response.StatusCode}: {errorBody}");
        }

        var body = await response.Content.ReadFromJsonAsync<JsonNode>(cancellationToken: ct);
        var choice = body!["choices"]![0]!["message"]!;

        var content = choice["content"]?.GetValue<string>();
        var toolCalls = new List<LlmToolCall>();
        if (choice["tool_calls"] is JsonArray tcArray)
        {
            foreach (var tc in tcArray)
            {
                toolCalls.Add(new LlmToolCall
                {
                    Id = tc!["id"]!.GetValue<string>(),
                    Name = tc["function"]!["name"]!.GetValue<string>(),
                    ArgumentsJson = tc["function"]!["arguments"]!.GetValue<string>(),
                });
            }
        }

        return new LlmCompletion { Content = content, ToolCalls = toolCalls };
    }

    // whisper-large-v3-turbo: rapido y barato, alcanza de sobra para una nota de voz
    // de un cliente pidiendo algo (no hace falta la precision del modelo completo).
    private const string TranscriptionModel = "whisper-large-v3-turbo";

    /// <summary>
    /// Transcribe una nota de voz de WhatsApp a texto en español, para que el agente
    /// (basado en texto) la procese como si el cliente la hubiera escrito.
    /// </summary>
    public async Task<string> TranscribirAudioAsync(byte[] audioBytes, string nombreArchivo, CancellationToken ct = default)
    {
        var apiKey = await ResolveApiKeyAsync(ct);
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Equals("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("La API key de Groq no está configurada.");
        }

        using var content = new MultipartFormDataContent();
        var archivo = new ByteArrayContent(audioBytes);
        archivo.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
        content.Add(archivo, "file", nombreArchivo);
        content.Add(new StringContent(TranscriptionModel), "model");
        content.Add(new StringContent("es"), "language");

        using var request = new HttpRequestMessage(HttpMethod.Post, "audio/transcriptions") { Content = content };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"Groq transcripcion {(int)response.StatusCode}: {errorBody}");
        }

        var body = await response.Content.ReadFromJsonAsync<JsonNode>(cancellationToken: ct);
        return body!["text"]!.GetValue<string>().Trim();
    }

    /// <summary>
    /// El panel guarda su propia API key en app_config (ver LlmSettingsController) sin
    /// reiniciar la API - mismo patrón que GeminiEmbeddingClient.ResolveApiKeyAsync.
    /// </summary>
    private async Task<string> ResolveApiKeyAsync(CancellationToken ct)
    {
        var overrideJson = await _configStore.GetAsync(ConfigKey, ct);
        if (string.IsNullOrWhiteSpace(overrideJson)) return _options.ApiKey;

        try
        {
            var stored = JsonSerializer.Deserialize<GroqConfigJson>(overrideJson);
            return !string.IsNullOrWhiteSpace(stored?.ApiKey) ? stored.ApiKey : _options.ApiKey;
        }
        catch (JsonException)
        {
            return _options.ApiKey;
        }
    }

    private static JsonArray BuildMessagesArray(IReadOnlyList<LlmMessage> messages)
    {
        var array = new JsonArray();
        foreach (var m in messages)
        {
            var node = new JsonObject { ["role"] = RoleToString(m.Role) };

            if (m.Content is not null)
            {
                node["content"] = m.Content;
            }

            if (m.Role == LlmRole.Tool)
            {
                node["tool_call_id"] = m.ToolCallId;
            }

            if (m.ToolCalls is { Count: > 0 })
            {
                var tcArray = new JsonArray();
                foreach (var tc in m.ToolCalls)
                {
                    tcArray.Add(new JsonObject
                    {
                        ["id"] = tc.Id,
                        ["type"] = "function",
                        ["function"] = new JsonObject
                        {
                            ["name"] = tc.Name,
                            ["arguments"] = tc.ArgumentsJson,
                        },
                    });
                }
                node["tool_calls"] = tcArray;
            }

            array.Add(node);
        }
        return array;
    }

    private static JsonArray BuildToolsArray(IReadOnlyList<LlmToolDefinition> tools)
    {
        var array = new JsonArray();
        foreach (var t in tools)
        {
            array.Add(new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = t.Name,
                    ["description"] = t.Description,
                    ["parameters"] = JsonNode.Parse(t.ParametersJsonSchema),
                },
            });
        }
        return array;
    }

    private static string RoleToString(LlmRole role) => role switch
    {
        LlmRole.System => "system",
        LlmRole.User => "user",
        LlmRole.Assistant => "assistant",
        LlmRole.Tool => "tool",
        _ => throw new ArgumentOutOfRangeException(nameof(role)),
    };
}
