using System.Globalization;
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
            "cliente_identificacion": { "type": "string", "description": "NIT o cedula del cliente, tal cual lo dio" },
            "cliente_ciudad": { "type": "string", "description": "Ciudad del cliente" },
            "cliente_correo": { "type": "string", "description": "Correo del cliente, para enviarle el PDF" },
            "asesor": { "type": "string", "description": "Nombre del asesor verificado" },
            "telefono_asesor": { "type": "string", "description": "Teléfono del usuario actual, obligatorio" }
          },
          "required": ["codigos_sap", "cliente_nombre", "cliente_identificacion", "cliente_ciudad", "cliente_correo", "asesor", "telefono_asesor"]
        }
        """;

    // El contenedor corre con cultura invariante y N0 saldria con coma de miles.
    private static readonly CultureInfo Colombia = new("es-CO");

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
            ClienteIdentificacion = LeerString(root, "cliente_identificacion"),
            ClienteCiudad = LeerString(root, "cliente_ciudad"),
            ClienteEmail = LeerString(root, "cliente_correo"),
            ClienteTelefono = telefono,
            Asesor = root.GetProperty("asesor").GetString() ?? string.Empty,
            TelefonoAsesor = root.GetProperty("telefono_asesor").GetString() ?? telefono,
        };

        try
        {
            var resultado = await _cotizaciones.GenerarAsync(request, ct);

            // Se devuelve el bloque ya redactado porque el modelo, al reescribir
            // estos datos, escribia "(precio pendiente de confirmar)" teniendo el
            // total, y le cambiaba el dominio al enlace. Copiar es fiable;
            // reformatear no.
            var mensaje =
                $"📄 *Folio:* {resultado.Folio}\n" +
                $"💰 *Total:* ${resultado.Total.ToString("N0", Colombia)} (IVA incluido)\n" +
                $"🔗 {resultado.PdfUrl}";

            return ToolResult.Ok(new
            {
                folio = resultado.Folio,
                total = resultado.Total,
                pdf_url = resultado.PdfUrl,
                mensaje_para_cliente = mensaje,
            });
        }
        catch (AsesorNoVerificadoException ex)
        {
            return ToolResult.Fail(ex.Message);
        }
        catch (Exception ex) when (ex.Message.StartsWith("Ninguna referencia se pudo resolver en el catalogo", StringComparison.Ordinal))
        {
            // Pasa cuando codigos_sap trae el nombre comercial que el modelo uso en
            // el chat (ej. "H6C Pro 8MP") en vez del CodigoSap real devuelto por
            // buscar_productos - un error de datos, no del sistema. Es recuperable
            // en el mismo turno si el modelo corrige el valor, asi que se le dice
            // eso en vez de mandarlo directo al mensaje de fallo definitivo.
            return ToolResult.Fail(
                "codigos_sap no coincidio con ningun producto real: revisa que estes mandando el " +
                "valor EXACTO del campo CodigoSap que devolvio buscar_productos/verificar_stock para " +
                "esta referencia (un codigo, no el nombre comercial que usaste en el chat) y vuelve a " +
                "llamar generar_cotizacion con ese valor corregido.");
        }
        catch (Exception ex)
        {
            // Generar el PDF o subirlo puede fallar por configuracion o por un
            // servicio externo caido. Antes la excepcion subia hasta el
            // controlador y la peticion moria en 500: el cliente pedia su
            // cotizacion y no recibia ni una palabra. Es preferible que el
            // agente lo sepa y responda algo util.
            //
            // NUNCA prometer "un asesor te la hace llegar": nadie monitorea eso, es
            // una promesa que no se cumple. El agente debe ser honesto sobre el
            // problema tecnico (ver regla FLUJO COTIZACION / punto 7 del prompt).
            return ToolResult.Fail(
                "No se pudo generar el PDF de la cotizacion (" + ex.GetType().Name + "). " +
                "Es un problema tecnico real, no de datos: dile al cliente con honestidad que " +
                "hubo un problema generando el documento (sin prometer que 'un asesor se la manda', " +
                "nadie recibe ese aviso) y ofrece intentarlo de nuevo o escalar a un humano si vuelve a fallar.");
        }
    }

    private static string? LeerString(JsonElement root, string nombre) =>
        root.TryGetProperty(nombre, out var el) && el.ValueKind == JsonValueKind.String ? el.GetString() : null;
}
