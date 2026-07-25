using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Llm;

public class DeepSeekOptions
{
    public string ApiKey { get; set; } = null!;
    public string BaseUrl { get; set; } = "https://api.deepseek.com";
    public string Model { get; set; } = "deepseek-chat";
    public double Temperature { get; set; } = 0.3;
    public int MaxTokens { get; set; } = 512;
}

/// <summary>
/// Cliente para la API de DeepSeek (compatible con el formato "chat completions" de
/// OpenAI, incluyendo tool calling nativo). Implementa ILlmClient para que el
/// AgentOrchestrator sea agnóstico al proveedor.
/// </summary>
public class DeepSeekClient : ILlmClient
{
    private readonly HttpClient _http;
    private readonly DeepSeekOptions _options;

    public DeepSeekClient(HttpClient http, DeepSeekOptions options)
    {
        _http = http;
        _options = options;
        _http.BaseAddress = new Uri(_options.BaseUrl);
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.ApiKey);
    }

    public async Task<LlmCompletion> CompleteAsync(
        IReadOnlyList<LlmMessage> messages,
        IReadOnlyList<LlmToolDefinition> tools,
        CancellationToken ct = default)
    {
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

        using var response = await _http.PostAsJsonAsync("/v1/chat/completions", payload, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"DeepSeek {(int)response.StatusCode}: {errorBody}");
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
