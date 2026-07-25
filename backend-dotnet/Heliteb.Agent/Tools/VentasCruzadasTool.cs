using System.Text.Json;
using Heliteb.Application.Agent;
using Heliteb.Application.Catalog;

namespace Heliteb.Agent.Tools;

public class VentasCruzadasTool : IAgentTool
{
    private readonly IProductQueries _productos;

    public VentasCruzadasTool(IProductQueries productos)
    {
        _productos = productos;
    }

    public string Name => "ventas_cruzadas";

    public string Description => "Sugiere productos relacionados/complementarios (misma categoría) a un modelo base, para venta cruzada.";

    public string ParametersJsonSchema => """
        { "type": "object", "properties": { "query": { "type": "string", "description": "Modelo base" } }, "required": ["query"] }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var query = doc.RootElement.GetProperty("query").GetString() ?? string.Empty;

        var resultados = await _productos.VentasCruzadasAsync(query, ct: ct);
        return ToolResult.Ok(resultados);
    }
}
