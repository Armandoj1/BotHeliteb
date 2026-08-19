using System.Text.Json;
using Heliteb.Application.Agent;

namespace Heliteb.Agent.Tools;

/// <summary>
/// Enlaces a las imagenes de los QR de pago fisicos que hay en algunas sedes
/// (Centro-Valledupar, Riohacha, Santa Marta). Como el envio de WhatsApp real
/// pasa por el Salesbot de Kommo leyendo un campo de texto (no hay un canal de
/// adjuntos propio verificado, ver EnviarPorWhatsAppAsync), la imagen se entrega
/// como enlace dentro del mensaje - igual patron que ya funciona con el PDF de
/// la cotizacion.
/// </summary>
public class ConsultarQrPagoTool : IAgentTool
{
    // Cloudinary, subidas el 2026-08-19 desde los PDF originales que dio Jose.
    // Si aparece una sede nueva con QR fisico, agregar aqui su alias -> URL.
    private static readonly Dictionary<string, string> UrlPorSede = new(StringComparer.OrdinalIgnoreCase)
    {
        ["centro"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159466/medios-pago/qr-centro-valledupar.png",
        ["valledupar centro"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159466/medios-pago/qr-centro-valledupar.png",
        ["a. centro"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159466/medios-pago/qr-centro-valledupar.png",
        ["riohacha"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159467/medios-pago/qr-riohacha.png",
        ["a. riohacha"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159467/medios-pago/qr-riohacha.png",
        ["santa marta"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159468/medios-pago/qr-santa-marta.png",
        ["a. santa marta"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159468/medios-pago/qr-santa-marta.png",
    };

    public string Name => "consultar_qr_pago";

    public string Description =>
        "Devuelve el enlace de la imagen del QR de pago fisico de una sede, para pagar desde la app del banco. " +
        "Solo existe para Centro (Valledupar), Riohacha y Santa Marta - las demas sedes no tienen QR fisico propio, " +
        "usa consultar_medios_pago para esas. Llamala cuando el cliente elija pagar por QR y ya sepas en que sede " +
        "va a pagar (si no lo sabes, preguntaselo antes de llamarla).";

    public string ParametersJsonSchema => """
        {
          "type": "object",
          "properties": {
            "sede": { "type": "string", "description": "Sede donde el cliente va a pagar, ej. 'Centro', 'Riohacha', 'Santa Marta'" }
          },
          "required": ["sede"]
        }
        """;

    public Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var sede = doc.RootElement.TryGetProperty("sede", out var el) ? el.GetString() ?? "" : "";

        if (UrlPorSede.TryGetValue(sede.Trim(), out var url))
        {
            return Task.FromResult(ToolResult.Ok(new { encontrado = true, sede, url_qr = url }));
        }

        return Task.FromResult(ToolResult.Ok(new
        {
            encontrado = false,
            sede,
            motivo = "Esta sede no tiene QR fisico propio. Ofrece transferencia bancaria o contraentrega (consultar_medios_pago).",
        }));
    }
}
