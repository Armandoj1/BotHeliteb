using System.Text.Json;
using Heliteb.Application.Agent;

namespace Heliteb.Agent.Tools;

public class ConsultarGarantiaTool : IAgentTool
{
    private readonly IInformacionEmpresaRepository _info;

    public ConsultarGarantiaTool(IInformacionEmpresaRepository info)
    {
        _info = info;
    }

    public string Name => "consultar_garantia";

    public string Description => "Consulta la política de garantía de HELITEB: tiempos de garantía en meses por marca/tipo de producto, y/o el texto de la política (qué cubre, qué no cubre, plazos de atención, devoluciones/cambios, excepciones, procedimiento). Úsala ante cualquier pregunta sobre garantía, cambio o devolución de un producto.";

    public string ParametersJsonSchema => """
        {
          "type": "object",
          "properties": {
            "marca": {
              "type": "string",
              "description": "Marca del producto (ej. Hikvision, Hilook, EZVIZ, TP-Link, Ubiquiti). Déjalo vacío si no aplica o no se conoce."
            },
            "tipo_producto": {
              "type": "string",
              "description": "Tipo/familia de producto (ej. cámara, DVR, NVR, disco duro, UPS, cable). Déjalo vacío si no aplica."
            },
            "tema": {
              "type": "string",
              "enum": ["que_cubre", "que_no_cubre", "plazos_atencion", "devoluciones_cambios", "exoneracion_devolucion", "motivos_devolucion", "excepciones_garantia", "importante_general", "constancias_procedimiento", "condiciones_generales"],
              "description": "Sección de la política de texto a consultar (procedimientos, devoluciones, excepciones, etc.). Solo inclúyelo si la pregunta es sobre el PROCEDIMIENTO/condiciones, no sobre cuántos meses dura una garantía."
            }
          },
          "required": []
        }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var root = doc.RootElement;
        var marca = LeerString(root, "marca");
        var tipoProducto = LeerString(root, "tipo_producto");
        var tema = LeerString(root, "tema");

        var garantias = await _info.BuscarGarantiasAsync(marca, tipoProducto, ct);
        var politicas = await _info.BuscarPoliticasAsync(tema, ct);

        return ToolResult.Ok(new { garantias, politicas });
    }

    private static string? LeerString(JsonElement root, string nombre) =>
        root.TryGetProperty(nombre, out var el) && el.ValueKind == JsonValueKind.String ? el.GetString() : null;
}
