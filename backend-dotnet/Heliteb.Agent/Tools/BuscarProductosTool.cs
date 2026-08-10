using System.Text.Json;
using Heliteb.Application.Agent;
using Heliteb.Application.Catalog;

namespace Heliteb.Agent.Tools;

public class BuscarProductosTool : IAgentTool
{
    private readonly IProductQueries _productos;

    public BuscarProductosTool(IProductQueries productos)
    {
        _productos = productos;
    }

    public string Name => "buscar_productos";

    public string Description => "Busca productos del catálogo HELITEB (Hikvision/EZVIZ) por texto libre MÁS filtros exactos opcionales. El stock se filtra y ordena automáticamente, no hace falta pedirlo en el texto. IMPORTANTE: cuando el cliente dice un criterio exacto (tipo de producto, cantidad de canales, resolución en MP, o que quiere lo más barato/económico), pásalo en el filtro estructurado correspondiente — NO lo dejes solo en el texto libre, el filtro exacto es mucho más confiable.";

    public string ParametersJsonSchema => """
        {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "SOLO los términos que describen el producto: tipo (domo, turret, bala, PTZ), uso (interior, exterior), características (lente fijo, resolución, marca/modelo), y tecnología (IP, PoE, red, WiFi, análoga/Turbo HD, térmica) PERO SOLO SI el usuario la mencionó explícitamente. NUNCA agregues por tu cuenta palabras de tecnología que el usuario no dijo (ej. no asumas 'IP' solo porque preguntó por un domo) — inventar criterios de búsqueda que el cliente no pidió cambia los resultados y lo confunde. Si el usuario SÍ mencionó una de esas palabras, no la quites. SÍ quita palabras que no describen el producto: 'stock', 'disponible', 'tienen', 'cuáles', 'qué referencias'. Ejemplo: '¿qué domos IP con lente fijo tienen stock?' -> query='camara domo IP lente fijo' (el usuario sí dijo IP, se mantiene). Pero 'necesito un domo interior lente fijo' -> query='camara domo interior lente fijo' (SIN agregar IP, el usuario no lo mencionó)."
            },
            "tipo_producto": {
              "type": "string",
              "enum": ["dvr", "nvr", "camara", "switch", "disco_duro", "accesorio"],
              "description": "Tipo exacto de producto SOLO si el cliente lo pidió explícitamente. Usa 'dvr' para grabador análogo/Turbo HD, 'nvr' para grabador IP. Si pidió 'grabador' sin especificar tecnología, elige según las cámaras de las que vienen hablando (análogas->dvr, IP->nvr) o no lo pases si no está claro. Usa 'accesorio' cuando busques un complemento genérico (tarjeta de memoria/SD, soporte, fuente, cable, etc.) y la búsqueda de texto libre no encuentre nada - este filtro cubre TODAS las categorías de accesorios del catálogo (CCTV, redes, video intercom, almacenamiento, etc.) por SQL exacto, sin depender de que el texto coincida semánticamente."
            },
            "tecnologia": {
              "type": "string",
              "enum": ["wifi", "ip", "analoga"],
              "description": "SOLO para cámaras, y SOLO si el cliente mencionó explícitamente la conexión (inalámbrica/WiFi, IP/red/PoE, o análoga/Turbo HD/cableada). CRÍTICO: si el cliente pidió 'económica'/'barata' (ordenar_por=precio_asc) Y mencionó la conexión, pasa AMBOS filtros juntos - de lo contrario 'económica' puede devolver la cámara más barata de OTRA conexión, ignorando lo que el cliente sí pidió."
            },
            "canales": {
              "type": "integer",
              "description": "Cantidad EXACTA de canales del grabador (DVR/NVR) que pidió el cliente (ej. 4, 8, 16). Solo si lo dijo explícitamente o se deduce directo de cuántas cámaras va a instalar (1-4 cámaras -> 4 canales)."
            },
            "resolucion_mp": {
              "type": "integer",
              "description": "Resolución en megapíxeles pedida explícitamente por el cliente (ej. 2, 4, 8). No lo pases si no la mencionó."
            },
            "ordenar_por": {
              "type": "string",
              "enum": ["precio_asc", "precio_desc"],
              "description": "Usa 'precio_asc' cuando el cliente pide algo económico/barato/lo más básico, 'precio_desc' cuando pide lo mejor/premium/más potente. Omítelo si no expresó preferencia de precio."
            }
          },
          "required": ["query"]
        }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var root = doc.RootElement;
        var query = root.GetProperty("query").GetString() ?? string.Empty;

        var filtros = new ProductoFiltros
        {
            TipoProducto = LeerString(root, "tipo_producto"),
            Canales = LeerEntero(root, "canales"),
            ResolucionMp = LeerEntero(root, "resolucion_mp"),
            Tecnologia = LeerString(root, "tecnologia"),
            OrdenarPor = LeerString(root, "ordenar_por"),
        };

        var resultados = await _productos.BuscarProductosAsync(query, filtros, ct: ct);
        // Se recorta antes de mandárselo al modelo: ver ProductoParaAgente.
        return ToolResult.Ok(resultados.Select(ProductoParaAgente.Desde).ToList());
    }

    private static string? LeerString(JsonElement root, string nombre) =>
        root.TryGetProperty(nombre, out var el) && el.ValueKind == JsonValueKind.String ? el.GetString() : null;

    // El LLM a veces manda números como string ("4" en vez de 4) — se aceptan ambos.
    private static int? LeerEntero(JsonElement root, string nombre)
    {
        if (!root.TryGetProperty(nombre, out var el)) return null;
        return el.ValueKind switch
        {
            JsonValueKind.Number when el.TryGetInt32(out var n) => n,
            JsonValueKind.String when int.TryParse(el.GetString(), out var s) => s,
            _ => null,
        };
    }
}
