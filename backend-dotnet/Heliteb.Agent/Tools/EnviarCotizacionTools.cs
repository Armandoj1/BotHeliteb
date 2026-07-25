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

        await _cotizaciones.EnviarPorEmailAsync(folio, destino, ct);
        return ToolResult.Ok(new { ok = true });
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

        await _cotizaciones.EnviarPorWhatsAppAsync(folio, destino, ct);
        return ToolResult.Ok(new { ok = true });
    }
}
