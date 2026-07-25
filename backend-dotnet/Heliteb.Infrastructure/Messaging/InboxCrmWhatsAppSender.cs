using System.Net.Http.Json;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Messaging;

public class InboxCrmOptions
{
    public string BaseUrl { get; set; } = "https://lumark.cloud";
    public string ApiKey { get; set; } = null!;
}

/// <summary>
/// Reutiliza el contrato ya existente de InboxCRM (POST /api/send, header X-Api-Key)
/// que hoy usa n8n para despachar los mensajes de WhatsApp. InboxCRM no se modifica.
/// </summary>
public class InboxCrmWhatsAppSender : IWhatsAppSender
{
    private readonly HttpClient _http;
    private readonly InboxCrmOptions _options;

    public InboxCrmWhatsAppSender(HttpClient http, InboxCrmOptions options)
    {
        _http = http;
        _options = options;
        _http.BaseAddress = new Uri(_options.BaseUrl);
        _http.DefaultRequestHeaders.Add("X-Api-Key", _options.ApiKey);
    }

    public async Task SendAsync(string to, string body, string? contactName = null, string? channel = null, CancellationToken ct = default)
    {
        // El largo del mensaje ya lo decide el AgentOrchestrator (con corte respetando
        // límites de oración/línea) — este sender no debe volver a truncar con un
        // substring ciego, o se pierde ese trabajo justo antes de enviar.
        var response = await _http.PostAsJsonAsync("/api/send", new
        {
            to,
            body,
            contactName = contactName ?? string.Empty,
            channel,
        }, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task SendMediaAsync(string to, string body, string mediaUrl, string fileName, string? channel = null, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("/api/send", new
        {
            to,
            body,
            contactName = string.Empty,
            mediaUrl,
            fileName,
            channel,
        }, ct);
        response.EnsureSuccessStatusCode();
    }
}
