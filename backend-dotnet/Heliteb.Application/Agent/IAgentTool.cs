namespace Heliteb.Application.Agent;

public class ToolResult
{
    public static ToolResult Ok(object? data) => new() { Success = true, Data = data };
    public static ToolResult Fail(string error) => new() { Success = false, Error = error };

    public bool Success { get; set; }
    public object? Data { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Una herramienta invocable por el agente. Cada implementación corresponde 1:1 a uno
/// de los toolWorkflow nodes que hoy vive en n8n (buscar_productos, verificar_stock, etc.),
/// pero se ejecuta en proceso en vez de disparar un sub-workflow.
/// </summary>
public interface IAgentTool
{
    string Name { get; }

    string Description { get; }

    /// <summary>JSON Schema (como texto) de los parámetros que espera el LLM enviar.</summary>
    string ParametersJsonSchema { get; }

    Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default);
}
