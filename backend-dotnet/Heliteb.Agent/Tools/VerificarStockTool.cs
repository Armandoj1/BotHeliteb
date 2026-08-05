using System.Text.Json;
using Heliteb.Application.Agent;
using Heliteb.Application.Catalog;

namespace Heliteb.Agent.Tools;

public class VerificarStockTool : IAgentTool
{
    private const int MaxResultados = 20;

    private readonly IProductQueries _productos;

    public VerificarStockTool(IProductQueries productos)
    {
        _productos = productos;
    }

    public string Name => "verificar_stock";

    public string Description => "Consulta el stock disponible por sede/almacén de un producto, desde el inventario real de HELITEB (sincronizado de Odoo). Acepta el modelo, el código corto del producto o el código SAP.";

    public string ParametersJsonSchema => """
        { "type": "object", "properties": { "query": { "type": "string", "description": "Modelo, código corto o código SAP del producto a buscar" } }, "required": ["query"] }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var query = doc.RootElement.GetProperty("query").GetString() ?? string.Empty;

        var stock = await _productos.VerificarStockAsync(query, ct);

        var resultados = stock
            .Take(MaxResultados)
            .Select(s => new
            {
                modelo = s.Modelo,
                codigo_sap = s.CodigoSap,
                almacen = s.NombreSucursal,
                ciudad = s.Ciudad,
                stock_actual = s.CantidadDisponible,
                // 'sede' = mostrador, entrega directa. 'central' = bodega logística,
                // hay unidades pero requieren traslado; el agente debe decirlo.
                tipo_bodega = s.TipoBodega,
                variante_exacta = s.VarianteExacta,
            })
            .ToList();

        return ToolResult.Ok(resultados);
    }
}
