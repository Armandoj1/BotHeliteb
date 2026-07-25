using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Heliteb.Api.Controllers;

public class WhatsAppWebhookRequest
{
    public string? Body { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
    public string? Direction { get; set; }
    public string? ContactName { get; set; }

    /// <summary>"QR"/"META" (WhatsApp) o "TELEGRAM" — decide por qué canal InboxCRM debe enviar la respuesta.</summary>
    public string? Channel { get; set; }
}

/// <summary>
/// Reemplaza el webhook de n8n. InboxCRM reenvía los mensajes de WhatsApp a esta
/// misma ruta (POST /webhook/heliteb-whatsapp) con su propio shape de payload
/// (messageId, conversationId, contactId, body, contactName, direction, to, from),
/// firmado con X-InboxCRM-Signature.
///
/// InboxCRM reenvía en modo "fire and forget" con un timeout corto (~5s) del lado
/// de su HttpClient: no espera nuestra respuesta. Por eso el agente (LLM + tools,
/// que puede tardar varios segundos) corre en un scope de DI propio, desacoplado
/// del CancellationToken de la petición entrante — si atáramos todo al ct del
/// request, la desconexión de InboxCRM a los 5s cancelaría el envío de la
/// respuesta aunque el agente ya la hubiera calculado.
/// </summary>
[ApiController]
[Microsoft.AspNetCore.Authorization.AllowAnonymous] // verificado por HMAC propio (WebhookSecretMiddleware), no por JWT
[Route("webhook/heliteb-whatsapp")]
public class WhatsAppWebhookController : ControllerBase
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WhatsAppWebhookController> _logger;

    public WhatsAppWebhookController(IServiceScopeFactory scopeFactory, ILogger<WhatsAppWebhookController> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [HttpPost]
    public IActionResult Receive([FromBody] WhatsAppWebhookRequest request)
    {
        var telefono = request.From ?? request.To;
        if (!string.Equals(request.Direction, "INBOUND", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(request.Body) ||
            string.IsNullOrWhiteSpace(telefono))
        {
            return Ok();
        }

        _ = ProcessInBackgroundAsync(telefono, request.Body, request.ContactName, request.Channel);

        return Ok();
    }

    private async Task ProcessInBackgroundAsync(string telefono, string mensaje, string? contactName, string? channel)
    {
        using var scope = _scopeFactory.CreateScope();
        var agent = scope.ServiceProvider.GetRequiredService<IAgentOrchestrator>();
        var sender = scope.ServiceProvider.GetRequiredService<IWhatsAppSender>();
        var kommo = scope.ServiceProvider.GetRequiredService<IKommoChatSender>();

        await PushToKommoAsync(kommo.PushInboundMessageAsync(telefono, contactName, mensaje), telefono);

        string respuesta;
        try
        {
            respuesta = await agent.HandleMessageAsync(telefono, mensaje, contactName, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fallo el agente para {Telefono}", telefono);
            respuesta = "Tuve un problema procesando tu mensaje, ¿puedes intentar de nuevo en un momento?";
        }

        try
        {
            await sender.SendAsync(telefono, respuesta, contactName, channel, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fallo el envío de {Channel} para {Telefono}", channel ?? "WhatsApp", telefono);
        }

        await PushToKommoAsync(kommo.PushOutboundMessageAsync(telefono, contactName, respuesta), telefono);
    }

    /// <summary>
    /// Espejo hacia el inbox de Kommo (canal adicional, ver KommoChatSender) — best-effort:
    /// un fallo acá nunca debe afectar la entrega real del mensaje por WhatsApp.
    /// </summary>
    private async Task PushToKommoAsync(Task push, string telefono)
    {
        try
        {
            await push;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fallo el espejo a Kommo para {Telefono}", telefono);
        }
    }
}
