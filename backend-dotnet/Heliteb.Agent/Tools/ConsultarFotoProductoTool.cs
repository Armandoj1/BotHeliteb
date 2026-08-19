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
        "Usa el codigo_sap exacto que ya viste en buscar_productos/verificar_stock para ese producto, nunca " +
        "inventes uno. Si el producto no tiene foto cargada, dilo tal cual, no ofrezcas un enlace que no existe.";

    public string ParametersJsonSchema => """
        {
          "type": "object",
          "properties": {
            "codigo_sap": { "type": "string", "description": "Codigo SAP exacto del producto, tal como aparecio en la busqueda" }
          },
          "required": ["codigo_sap"]
        }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var codigoSap = doc.RootElement.TryGetProperty("codigo_sap", out var el) ? el.GetString() ?? "" : "";

        var producto = await _productos.GetByCodigoSapAsync(codigoSap.Trim(), ct);

        if (producto is null || string.IsNullOrWhiteSpace(producto.ImagenUrl))
        {
            return ToolResult.Ok(new
            {
                encontrado = false,
                codigo_sap = codigoSap,
                motivo = "No hay foto cargada para este producto.",
            });
        }

        // ImagenUrl se arma por convencion (base de Cloudinary + codigo_sap, ver
        // ProductRepository) sin verificar que la imagen exista realmente ahi -
        // antes eso no importaba porque el modelo nunca la mostraba. Ahora que
        // se manda como boton clicable al cliente, un 404 real seria un enlace
        // roto entregado en vivo, asi que se confirma con un HEAD antes de ofrecerla.
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
            codigo_sap = codigoSap,
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
