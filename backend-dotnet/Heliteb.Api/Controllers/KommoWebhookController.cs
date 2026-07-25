using System.Security.Cryptography;
using System.Text;
using Heliteb.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Heliteb.Api.Controllers;

public class KommoWebhookRequest
{
    public KommoWebhookMessage? Message { get; set; }
}

public class KommoWebhookMessage
{
    public KommoWebhookConversation? Conversation { get; set; }
    public KommoWebhookMessageBody? Message { get; set; }
}

public class KommoWebhookConversation
{
    public string? Id { get; set; }
}

public class KommoWebhookMessageBody
{
    public string? Text { get; set; }
}

/// <summary>
/// Recibe el callback de Kommo cuando un asesor responde manualmente dentro del chat
/// espejado por KommoChatSender. No pasa por el agente/LLM — es un humano
/// respondiendo, se reenvía tal cual al cliente por WhatsApp vía IWhatsAppSender.
///
/// OJO: el shape de KommoWebhookRequest está armado según la referencia pública de
/// la Chats API (Kommo no expone esta doc sin cuenta de desarrollador) — verificar
/// contra el payload real la primera vez que se pruebe con una cuenta Kommo real y
/// ajustar acá si hace falta.
///
/// Verificación: a diferencia de InboxCRM, Kommo no firma este webhook, así que se
/// exige un secreto compartido por query string (?key=...) — el mismo valor que se
/// registra junto con esta URL en el panel de Kommo al conectar el canal.
/// </summary>
[ApiController]
[Microsoft.AspNetCore.Authorization.AllowAnonymous] // verificado por secreto propio (?key=), no por JWT
[Route("webhook/kommo-events")]
public class KommoWebhookController : ControllerBase
{
    private const string ConversationPrefix = "whatsapp-";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<KommoWebhookController> _logger;

    public KommoWebhookController(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<KommoWebhookController> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost]
    public IActionResult Receive([FromQuery] string? key, [FromBody] KommoWebhookRequest request)
    {
        var expectedKey = _configuration["Webhook:KommoSharedSecret"];
        if (string.IsNullOrEmpty(expectedKey) || !FixedTimeEquals(key, expectedKey))
        {
            return Unauthorized();
        }

        var conversationId = request.Message?.Conversation?.Id;
        var texto = request.Message?.Message?.Text;
        if (string.IsNullOrWhiteSpace(conversationId) ||
            string.IsNullOrWhiteSpace(texto) ||
            !conversationId.StartsWith(ConversationPrefix, StringComparison.Ordinal))
        {
            return Ok();
        }

        var telefono = conversationId[ConversationPrefix.Length..];
        _ = ForwardToWhatsAppAsync(telefono, texto);

        return Ok();
    }

    private async Task ForwardToWhatsAppAsync(string telefono, string texto)
    {
        using var scope = _scopeFactory.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<IWhatsAppSender>();

        try
        {
            await sender.SendAsync(telefono, texto, null, null, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fallo al reenviar por WhatsApp la respuesta de Kommo para {Telefono}", telefono);
        }
    }

    private static bool FixedTimeEquals(string? provided, string expected)
    {
        if (provided is null) return false;

        var providedBytes = Encoding.UTF8.GetBytes(provided);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return providedBytes.Length == expectedBytes.Length &&
            CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
    }
}
