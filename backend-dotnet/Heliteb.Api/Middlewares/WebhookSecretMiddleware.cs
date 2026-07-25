using System.Security.Cryptography;
using System.Text;

namespace Heliteb.Api.Middlewares;

/// <summary>
/// Verifica la firma HMAC-SHA256 que InboxCRM pone en sus webhooks reenviados
/// (header X-InboxCRM-Signature: sha256=&lt;hex&gt;, calculado sobre el cuerpo JSON
/// crudo con el secreto configurado por workspace en WorkspaceWebhookSettings).
/// Mismo esquema que GitHub/Stripe. Si aún no se configuró el secreto
/// (Webhook:InboxCrmSigningSecret), deja pasar sin verificar y solo advierte —
/// para no bloquear mensajes reales mientras se obtiene el secreto desde InboxCRM.
/// </summary>
public class WebhookSecretMiddleware
{
    private const string SignatureHeaderName = "X-InboxCRM-Signature";

    private readonly RequestDelegate _next;
    private readonly string? _signingSecret;
    private readonly ILogger<WebhookSecretMiddleware> _logger;

    public WebhookSecretMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<WebhookSecretMiddleware> logger)
    {
        _next = next;
        _signingSecret = configuration["Webhook:InboxCrmSigningSecret"];
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Solo cubre la ruta de InboxCRM: Kommo usa su propia verificación
        // (secreto compartido por query string, ver KommoWebhookController) porque
        // no firma sus webhooks con el mismo esquema HMAC-SHA256.
        if (!context.Request.Path.StartsWithSegments("/webhook/heliteb-whatsapp"))
        {
            await _next(context);
            return;
        }

        if (string.IsNullOrEmpty(_signingSecret))
        {
            _logger.LogWarning("Webhook:InboxCrmSigningSecret no configurado; se acepta la petición sin verificar firma.");
            await _next(context);
            return;
        }

        context.Request.EnableBuffering();
        using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync();
        context.Request.Body.Position = 0;

        var providedHeader = context.Request.Headers[SignatureHeaderName].ToString();
        const string prefix = "sha256=";
        var providedHex = providedHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? providedHeader[prefix.Length..]
            : providedHeader;

        var computedHash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(_signingSecret), Encoding.UTF8.GetBytes(rawBody));
        var computedHex = Convert.ToHexString(computedHash).ToLowerInvariant();

        var providedBytes = Encoding.UTF8.GetBytes(providedHex);
        var computedBytes = Encoding.UTF8.GetBytes(computedHex);
        var isValid = providedBytes.Length == computedBytes.Length &&
            CryptographicOperations.FixedTimeEquals(providedBytes, computedBytes);

        if (!isValid)
        {
            _logger.LogWarning("Firma de webhook inválida para {Path}", context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        await _next(context);
    }
}
