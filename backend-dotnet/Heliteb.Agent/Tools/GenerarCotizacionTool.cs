using System.Text.Json;
using Heliteb.Application.Agent;
using Heliteb.Application.Cotizaciones;
using Heliteb.Application.Cotizaciones.Dtos;

namespace Heliteb.Agent.Tools;

public class GenerarCotizacionTool : IAgentTool
{
    private readonly ICotizacionService _cotizaciones;

    public GenerarCotizacionTool(ICotizacionService cotizaciones)
    {
        _cotizaciones = cotizaciones;
    }

    public string Name => "generar_cotizacion";

    public string Description => "Genera la cotización en PDF para el cliente indicado con los códigos SAP dados. Requiere que telefono_asesor esté verificado.";

    public string ParametersJsonSchema => """
        {
          "type": "object",
          "properties": {
            "codigos_sap": { "type": "array", "items": { "type": "string" }, "description": "Códigos SAP a cotizar" },
            "cliente_nombre": { "type": "string" },
            "asesor": { "type": "string", "description": "Nombre del asesor verificado" },
            "telefono_asesor": { "type": "string", "description": "Teléfono del usuario actual, obligatorio" }
          },
          "required": ["codigos_sap", "cliente_nombre", "asesor", "telefono_asesor"]
        }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var root = doc.RootElement;

        var codigos = root.GetProperty("codigos_sap").EnumerateArray()
            .Select(e => e.GetString() ?? string.Empty)
            .Where(s => s.Length > 0)
            .ToArray();

        var request = new GenerarCotizacionRequest
        {
            CodigosSap = codigos,
            ClienteNombre = root.GetProperty("cliente_nombre").GetString() ?? string.Empty,
            Asesor = root.GetProperty("asesor").GetString() ?? string.Empty,
            TelefonoAsesor = root.GetProperty("telefono_asesor").GetString() ?? telefono,
        };

        try
        {
            var resultado = await _cotizaciones.GenerarAsync(request, ct);
            return ToolResult.Ok(resultado);
        }
        catch (AsesorNoVerificadoException ex)
        {
            return ToolResult.Fail(ex.Message);
        }
        catch (Exception ex)
        {
            // Generar el PDF o subirlo puede fallar por configuracion o por un
            // servicio externo caido. Antes la excepcion subia hasta el
            // controlador y la peticion moria en 500: el cliente pedia su
            // cotizacion y no recibia ni una palabra. Es preferible que el
            // agente lo sepa y responda algo util.
            return ToolResult.Fail(
                "No se pudo generar el PDF de la cotizacion (" + ex.GetType().Name + "). " +
                "Dile al cliente que un asesor se la hace llegar en unos minutos y sigue " +
                "la conversacion con normalidad; no vuelvas a intentarlo en este turno.");
        }
    }
}
