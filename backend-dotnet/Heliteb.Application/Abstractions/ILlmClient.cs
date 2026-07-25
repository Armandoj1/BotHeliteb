namespace Heliteb.Application.Abstractions;

public enum LlmRole
{
    System,
    User,
    Assistant,
    Tool
}

public class LlmMessage
{
    public LlmRole Role { get; set; }
    public string? Content { get; set; }
    public string? ToolCallId { get; set; }
    public string? Name { get; set; }
    public IReadOnlyList<LlmToolCall>? ToolCalls { get; set; }
}

public class LlmToolCall
{
    public string Id { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string ArgumentsJson { get; set; } = null!;
}

public class LlmToolDefinition
{
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    /// <summary>JSON Schema (object) describing the tool's parameters, as raw JSON text.</summary>
    public string ParametersJsonSchema { get; set; } = null!;
}

public class LlmCompletion
{
    public string? Content { get; set; }
    public IReadOnlyList<LlmToolCall> ToolCalls { get; set; } = Array.Empty<LlmToolCall>();
}

public interface ILlmClient
{
    Task<LlmCompletion> CompleteAsync(
        IReadOnlyList<LlmMessage> messages,
        IReadOnlyList<LlmToolDefinition> tools,
        CancellationToken ct = default);
}
