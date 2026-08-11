using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Heliteb.Application.Abstractions;
using Microsoft.Extensions.Logging;

namespace Heliteb.Infrastructure.Llm;

public class DeepSeekOptions
{
    // Valor con el que arranca la API si nunca se guardó nada desde el panel (ver
    // ResolveApiKeyAsync) - una vez que alguien la guarda ahí, esta queda ignorada.
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.deepseek.com";
    public string Model { get; set; } = "deepseek-chat";
    public double Temperature { get; set; } = 0.3;
    public int MaxTokens { get; set; } = 512;
}

/// <summary>Forma del JSON guardado en app_config.clave='deepseek'.</summary>
internal class DeepSeekConfigJson
{
    [JsonPropertyName("api_key")] public string? ApiKey { get; set; }
}

/// <summary>
/// Cliente para la API de DeepSeek (compatible con el formato "chat completions" de
/// OpenAI, incluyendo tool calling nativo). Implementa ILlmClient para que el
/// AgentOrchestrator sea agnóstico al proveedor.
/// </summary>
public class DeepSeekClient : ILlmClient
{
    private const string ConfigKey = "deepseek";

    private readonly HttpClient _http;
    private readonly DeepSeekOptions _options;
    private readonly IAppConfigStore _configStore;
    private readonly ILogger<DeepSeekClient> _logger;

    public DeepSeekClient(
        HttpClient http, DeepSeekOptions options, IAppConfigStore configStore, ILogger<DeepSeekClient> logger)
    {
        _http = http;
        _options = options;
        _configStore = configStore;
        _logger = logger;
        _http.BaseAddress = new Uri(_options.BaseUrl);
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
                "La API key de DeepSeek no está configurada. Guárdala en 'Uso de IA' → Credenciales de DeepSeek, en el panel.");
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

        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/chat/completions")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"DeepSeek {(int)response.StatusCode}: {errorBody}");
        }

        var body = await response.Content.ReadFromJsonAsync<JsonNode>(cancellationToken: ct);
        var eleccion = body!["choices"]![0]!;
        var choice = eleccion["message"]!;

        var content = choice["content"]?.GetValue<string>();

        // Desglose de tokens de CADA llamada. Es lo unico que explica el tiempo:
        // medido contra la API, la entrada casi no cuesta (8.400 tokens = +0,5s)
        // mientras que la salida se genera a ~75-90 tokens/s. Ademas deja ver si
        // el cache de contexto de DeepSeek esta funcionando (cache_hit > 0) y
        // cuantos tokens se van en razonamiento, que el cliente nunca ve.
        var uso = body["usage"];
        if (uso is not null)
        {
            _logger.LogInformation(
                "DeepSeek: entrada={Entrada} (cache={Cache}) salida={Salida} razonamiento={Razonamiento}",
                uso["prompt_tokens"]?.GetValue<int>() ?? 0,
                uso["prompt_cache_hit_tokens"]?.GetValue<int>() ?? 0,
                uso["completion_tokens"]?.GetValue<int>() ?? 0,
                uso["completion_tokens_details"]?["reasoning_tokens"]?.GetValue<int>() ?? 0);
        }

        // finish_reason='length' significa que la respuesta se corto por MaxTokens.
        // Sin este log, el sintoma que se ve arriba es una respuesta vacia o a
        // medias sin ninguna pista de por que.
        var razonFin = eleccion["finish_reason"]?.GetValue<string>();
        if (razonFin == "length" || (string.IsNullOrWhiteSpace(content) && choice["tool_calls"] is null))
        {
            _logger.LogWarning(
                "DeepSeek devolvio finish_reason={Razon} con {Caracteres} caracteres de contenido y sin tool_calls (max_tokens={MaxTokens}).",
                razonFin, content?.Length ?? 0, _options.MaxTokens);
        }
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
            var stored = JsonSerializer.Deserialize<DeepSeekConfigJson>(overrideJson);
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
