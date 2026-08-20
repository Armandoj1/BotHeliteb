using System.Net.Http;
using System.Text.Json;
using Heliteb.Application.Agent;
using Heliteb.Application.Catalog;

namespace Heliteb.Agent.Tools;

/// <summary>
/// Foto real del producto, para cuando el cliente quiere verlo antes de decidir.
/// Igual patron que ConsultarQrPagoTool: el envio real pasa por el Salesbot de
/// Kommo via un boton (buttons_url), no por un adjunto propio.
/// </summary>
public class ConsultarFotoProductoTool : IAgentTool
{
    private readonly IProductQueries _productos;
    private readonly IHttpClientFactory _httpFactory;

    public ConsultarFotoProductoTool(IProductQueries productos, IHttpClientFactory httpFactory)
    {
        _productos = productos;
        _httpFactory = httpFactory;
    }

    public string Name => "consultar_foto_producto";

    public string Description =>
        "Devuelve el enlace a la foto real de un producto, para cuando el cliente pide verlo antes de decidir. " +
        "Pasa el codigo_sap o el modelo/referencia, lo que hayas visto en buscar_productos/verificar_stock para " +
        "ese producto, nunca inventes uno. Si el producto no tiene foto cargada, dilo tal cual, no ofrezcas un " +
        "enlace que no existe.";

    public string ParametersJsonSchema => """
        {
          "type": "object",
          "properties": {
            "codigo_sap": { "type": "string", "description": "Codigo SAP o modelo/referencia del producto, tal como aparecio en la busqueda" }
          },
          "required": ["codigo_sap"]
        }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var codigoSap = doc.RootElement.TryGetProperty("codigo_sap", out var el) ? el.GetString() ?? "" : "";
        var query = codigoSap.Trim();

        var producto = await _productos.GetByCodigoSapAsync(query, ct);

        // El modelo a veces manda el modelo/referencia (ej. "CS-H6C-R100-8B4WF") en
        // vez del codigo SAP numerico interno (303102577) - son cosas distintas y
        // los confunde con frecuencia (mismo problema ya visto en CotizacionService/
        // OdooVentasService). Se reintenta como busqueda de catalogo antes de rendirse.
        if (producto is null && query.Length > 0)
        {
            var candidatos = await _productos.BuscarProductosAsync(query, limit: 1, ct: ct);
            producto = candidatos.FirstOrDefault();
        }

        if (producto is null || string.IsNullOrWhiteSpace(producto.ImagenUrl))
        {
            return ToolResult.Ok(new
            {
                encontrado = false,
                codigo_sap = codigoSap,
                motivo = "No hay foto cargada para este producto.",
            });
        }

        // La imagen se subio realmente a Cloudinary (ver migracion 008), pero se
        // confirma con un HEAD antes de ofrecerla: un 404 real seria un enlace roto
        // entregado en vivo al cliente como boton clicable.
        if (!await ExisteImagenAsync(producto.ImagenUrl, ct))
        {
            return ToolResult.Ok(new
            {
                encontrado = false,
                codigo_sap = codigoSap,
                motivo = "No hay foto cargada para este producto.",
            });
        }

        return ToolResult.Ok(new
        {
            encontrado = true,
            codigo_sap = producto.CodigoSap,
            modelo = producto.Modelo,
            url_foto = producto.ImagenUrl,
        });
    }

    private async Task<bool> ExisteImagenAsync(string url, CancellationToken ct)
    {
        try
        {
            using var http = _httpFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(5);
            using var req = new HttpRequestMessage(HttpMethod.Head, url);
            using var resp = await http.SendAsync(req, ct);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
