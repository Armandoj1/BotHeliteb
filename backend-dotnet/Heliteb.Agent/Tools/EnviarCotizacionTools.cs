using System.Text.Json;
using Heliteb.Application.Agent;
using Heliteb.Application.Cotizaciones;

namespace Heliteb.Agent.Tools;

public class EnviarEmailCotizacionTool : IAgentTool
{
    private readonly ICotizacionService _cotizaciones;

    public EnviarEmailCotizacionTool(ICotizacionService cotizaciones)
    {
        _cotizaciones = cotizaciones;
    }

    public string Name => "enviar_email_cotizacion";

    public string Description => "Reenvía una cotización ya generada, por correo electrónico, a un destinatario distinto.";

    public string ParametersJsonSchema => """
        { "type": "object", "properties": { "folio": { "type": "string" }, "destino": { "type": "string", "description": "Email destino" } }, "required": ["folio", "destino"] }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var folio = doc.RootElement.GetProperty("folio").GetString() ?? string.Empty;
        var destino = doc.RootElement.GetProperty("destino").GetString() ?? string.Empty;

        try
        {
            await _cotizaciones.EnviarPorEmailAsync(folio, destino, ct);
            return ToolResult.Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            // El correo depende de credenciales SMTP y de un servidor externo.
            // Si falla, el agente debe seguir la conversacion: antes la excepcion
            // llegaba al controlador y el cliente se quedaba sin ninguna respuesta.
            return ToolResult.Fail(
                "No se pudo enviar la cotizacion por correo (" + ex.GetType().Name + "). " +
                "Dile al cliente que le queda el enlace del PDF y que un asesor se la " +
                "reenvia al correo; sigue la conversacion con normalidad y no reintentes.");
        }
    }
}

public class EnviarWhatsAppCotizacionTool : IAgentTool
{
    private readonly ICotizacionService _cotizaciones;

    public EnviarWhatsAppCotizacionTool(ICotizacionService cotizaciones)
    {
        _cotizaciones = cotizaciones;
    }

    public string Name => "enviar_whatsapp_cotizacion";

    public string Description => "Reenvía una cotización ya generada, por WhatsApp, a un número distinto.";

    public string ParametersJsonSchema => """
        { "type": "object", "properties": { "folio": { "type": "string" }, "destino": { "type": "string", "description": "Teléfono destino" } }, "required": ["folio", "destino"] }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var folio = doc.RootElement.GetProperty("folio").GetString() ?? string.Empty;
        var destino = doc.RootElement.GetProperty("destino").GetString() ?? string.Empty;

        try
        {
            await _cotizaciones.EnviarPorWhatsAppAsync(folio, destino, ct);
            return ToolResult.Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            return ToolResult.Fail(
                "No se pudo reenviar la cotizacion por WhatsApp (" + ex.GetType().Name + "). " +
                "El cliente ya tiene el enlace del PDF en el chat: recuerdaselo y sigue " +
                "la conversacion con normalidad.");
        }
    }
}
