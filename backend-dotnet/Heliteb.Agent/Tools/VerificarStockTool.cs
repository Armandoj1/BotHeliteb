using System.Text.Json;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;

namespace Heliteb.Agent.Tools;

public class VerificarStockTool : IAgentTool
{
    private const int MaxResultados = 20;

    private readonly IInventarioExternoClient _inventario;

    public VerificarStockTool(IInventarioExternoClient inventario)
    {
        _inventario = inventario;
    }

    public string Name => "verificar_stock";

    public string Description => "Consulta el stock disponible por sede/almacén de un producto. Usa el modelo o una parte reconocible de él (ej. el código que aparece en buscar_productos) - esta fuente busca por texto de modelo, no por código SAP.";

    public string ParametersJsonSchema => """
        { "type": "object", "properties": { "query": { "type": "string", "description": "Modelo (o parte del modelo) del producto a buscar" } }, "required": ["query"] }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var query = doc.RootElement.GetProperty("query").GetString() ?? string.Empty;

        var items = await _inventario.ListarAsync(ct);
        var normalizado = Normalizar(query);

        var resultados = items
            .Where(i => Normalizar(i.ModeloParsed).Contains(normalizado, StringComparison.Ordinal))
            .OrderByDescending(i => i.StockActual)
            .Take(MaxResultados)
            .Select(i => new
            {
                modelo = i.ModeloParsed,
                almacen = i.Almacen,
                stock_actual = i.StockActual,
                tendencia = i.Tendencia,
            })
            .ToList();

        return ToolResult.Ok(resultados);
    }

    // Mismo criterio tolerante que el resto del agente: quitar todo lo que no sea
    // letra/digito para que parentesis, espacios y puntos no rompan el match.
    private static string Normalizar(string s) =>
        new string(s.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
}
