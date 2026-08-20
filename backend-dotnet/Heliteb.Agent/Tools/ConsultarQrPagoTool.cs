using System.Globalization;
using System.Text;
using System.Text.Json;
using Heliteb.Application.Agent;

namespace Heliteb.Agent.Tools;

/// <summary>
/// Enlaces a las imagenes de los QR de pago fisicos que hay en cada sede. Como el
/// envio de WhatsApp real pasa por el Salesbot de Kommo leyendo un campo de texto
/// (no hay un canal de adjuntos propio verificado, ver EnviarPorWhatsAppAsync), la
/// imagen se entrega como enlace dentro del mensaje - igual patron que ya funciona
/// con el PDF de la cotizacion.
/// </summary>
public class ConsultarQrPagoTool : IAgentTool
{
    // Cloudinary, subidas desde los PDF originales que dio Jose (2026-08-19 las
    // primeras 3, 2026-08-20 el resto). Si aparece una sede nueva con QR fisico,
    // agregar aqui su(s) alias -> URL.
    private static readonly Dictionary<string, string> UrlPorSede = new(StringComparer.OrdinalIgnoreCase)
    {
        ["centro"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159466/medios-pago/qr-centro-valledupar.png",
        ["valledupar centro"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159466/medios-pago/qr-centro-valledupar.png",
        ["a. centro"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159466/medios-pago/qr-centro-valledupar.png",

        ["obrero"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237860/medios-pago/qr-obrero.png",
        ["valledupar obrero"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237860/medios-pago/qr-obrero.png",
        ["a. obrero"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237860/medios-pago/qr-obrero.png",

        ["riohacha"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159467/medios-pago/qr-riohacha.png",
        ["a. riohacha"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159467/medios-pago/qr-riohacha.png",

        ["santa marta"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159468/medios-pago/qr-santa-marta.png",
        ["a. santa marta"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787159468/medios-pago/qr-santa-marta.png",

        ["monteria"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237861/medios-pago/qr-monteria.png",
        ["a. monteria"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237861/medios-pago/qr-monteria.png",

        ["sincelejo"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237862/medios-pago/qr-sincelejo.png",
        ["a. sincelejo"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237862/medios-pago/qr-sincelejo.png",

        // Dos sedes DISTINTAS en la misma ciudad, no dos cuentas para la misma -
        // si el cliente no especifica cual, hay que preguntarle antes de mandar.
        ["barranquilla 1"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237863/medios-pago/qr-barranquilla.png",
        ["a. barranquilla 1"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237863/medios-pago/qr-barranquilla.png",
        ["barranquilla 2"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237864/medios-pago/qr-barranquilla2.png",
        ["a. barranquilla 2"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237864/medios-pago/qr-barranquilla2.png",

        ["bogota"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237864/medios-pago/qr-bogota.png",
        ["a. bogota"] = "https://res.cloudinary.com/dye3rpg0a/image/upload/v1787237864/medios-pago/qr-bogota.png",
    };

    public string Name => "consultar_qr_pago";

    public string Description =>
        "Devuelve el enlace de la imagen del QR de pago fisico de una sede, para pagar desde la app del banco. " +
        "Cubre Centro y Obrero (Valledupar), Riohacha, Santa Marta, Monteria, Sincelejo, Barranquilla 1 y 2, y " +
        "Bogota. Barranquilla tiene DOS sedes distintas (1 y 2): si el cliente solo dice 'Barranquilla' sin " +
        "numero, preguntale cual antes de llamar esta herramienta. Llamala SIEMPRE que el cliente pida el QR, " +
        "aunque ya la hayas llamado antes en esta conversacion - nunca reuses ni inventes la URL de memoria.";

    public string ParametersJsonSchema => """
        {
          "type": "object",
          "properties": {
            "sede": { "type": "string", "description": "Sede donde el cliente va a pagar, ej. 'Centro', 'Riohacha', 'Barranquilla 1'" }
          },
          "required": ["sede"]
        }
        """;

    public Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var sede = doc.RootElement.TryGetProperty("sede", out var el) ? el.GetString() ?? "" : "";

        if (UrlPorSede.TryGetValue(sede.Trim(), out var url) || BuscarPorCoincidenciaParcial(sede, out url))
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

    // El modelo no siempre manda el alias exacto (ej. "sede de Monteria" en vez de
    // "Monteria") - se normaliza (sin tildes/mayusculas) y se busca por contención
    // en ambas direcciones, mismo patron ya usado en CotizacionService/OdooVentasService
    // para este tipo de coincidencia difusa.
    private static bool BuscarPorCoincidenciaParcial(string sede, out string? url)
    {
        var normalizado = Normalizar(sede);
        if (normalizado.Length > 0)
        {
            foreach (var (alias, valor) in UrlPorSede)
            {
                var aliasNormalizado = Normalizar(alias);
                if (normalizado.Contains(aliasNormalizado) || aliasNormalizado.Contains(normalizado))
                {
                    url = valor;
                    return true;
                }
            }
        }

        url = null;
        return false;
    }

    private static string Normalizar(string valor)
    {
        var descompuesto = valor.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in descompuesto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }
        return sb.ToString().ToUpperInvariant().Replace(".", "").Trim();
    }
}
