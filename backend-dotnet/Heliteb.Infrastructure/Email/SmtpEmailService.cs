using System.Text.Json;
using System.Text.Json.Serialization;
using Heliteb.Application.Abstractions;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Heliteb.Infrastructure.Email;

public class SmtpOptions
{
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string User { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string FromName { get; set; } = "HELITEB SAS";
}

/// <summary>
/// Forma del JSON guardado en app_config.clave='smtp' - heredada del backend Python
/// original (snake_case), ya tenía credenciales reales guardadas ahí antes de que
/// existiera este servicio en .NET.
/// </summary>
internal class SmtpConfigJson
{
    [JsonPropertyName("smtp_host")] public string? SmtpHost { get; set; }
    [JsonPropertyName("smtp_port")] public int? SmtpPort { get; set; }
    [JsonPropertyName("smtp_user")] public string? SmtpUser { get; set; }
    [JsonPropertyName("smtp_password")] public string? SmtpPassword { get; set; }
    [JsonPropertyName("from_name")] public string? FromName { get; set; }
}

public class SmtpEmailService : IEmailService
{
    private const string ConfigKey = "smtp";

    private readonly SmtpOptions _defaultOptions;
    private readonly IAppConfigStore _configStore;

    public SmtpEmailService(SmtpOptions defaultOptions, IAppConfigStore configStore)
    {
        _defaultOptions = defaultOptions;
        _configStore = configStore;
    }

    public async Task SendCotizacionAsync(string destinatario, string folio, byte[] pdfBytes, CancellationToken ct = default)
    {
        var options = await ResolveOptionsAsync(ct);
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(options.FromName, options.User));
        message.To.Add(MailboxAddress.Parse(destinatario));
        message.Subject = $"Cotización HELITEB — {folio}";

        var builder = new BodyBuilder
        {
            TextBody = $"Adjuntamos la cotización {folio}.",
            HtmlBody = EmailTemplate.Cotizacion(folio),
        };
        builder.Attachments.Add($"{folio}.pdf", pdfBytes, new ContentType("application", "pdf"));
        message.Body = builder.ToMessageBody();

        await SendAsync(message, options, ct);
    }

    public async Task SendCodigoOtpAsync(string destinatario, string codigo, CancellationToken ct = default)
    {
        var options = await ResolveOptionsAsync(ct);
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(options.FromName, options.User));
        message.To.Add(MailboxAddress.Parse(destinatario));
        message.Subject = "Tu código de verificación HELITEB";
        message.Body = new BodyBuilder
        {
            TextBody = $"Tu código de verificación es: {codigo} (vigente 10 minutos).",
            HtmlBody = EmailTemplate.Otp(codigo),
        }.ToMessageBody();

        await SendAsync(message, options, ct);
    }

    public async Task SendAlertaAsync(string destinatario, string asunto, string cuerpo, CancellationToken ct = default)
    {
        var options = await ResolveOptionsAsync(ct);
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(options.FromName, options.User));
        message.To.Add(MailboxAddress.Parse(destinatario));
        message.Subject = asunto;
        message.Body = new BodyBuilder
        {
            TextBody = cuerpo,
            HtmlBody = EmailTemplate.Alerta(cuerpo),
        }.ToMessageBody();

        await SendAsync(message, options, ct);
    }

    /// <summary>
    /// El panel puede guardar sus propias credenciales SMTP en caliente (ver
    /// SettingsController.GuardarSmtp) sin reiniciar la API - appsettings.json solo
    /// se lee una vez al arrancar, así que el override vive en app_config.
    /// </summary>
    private async Task<SmtpOptions> ResolveOptionsAsync(CancellationToken ct)
    {
        var overrideJson = await _configStore.GetAsync(ConfigKey, ct);
        if (string.IsNullOrWhiteSpace(overrideJson)) return _defaultOptions;

        try
        {
            var stored = JsonSerializer.Deserialize<SmtpConfigJson>(overrideJson);
            if (stored is null) return _defaultOptions;

            return new SmtpOptions
            {
                Host = stored.SmtpHost ?? _defaultOptions.Host,
                Port = stored.SmtpPort ?? _defaultOptions.Port,
                User = stored.SmtpUser ?? _defaultOptions.User,
                Password = stored.SmtpPassword ?? _defaultOptions.Password,
                FromName = stored.FromName ?? _defaultOptions.FromName,
            };
        }
        catch (JsonException)
        {
            return _defaultOptions;
        }
    }

    private static async Task SendAsync(MimeMessage message, SmtpOptions options, CancellationToken ct)
    {
        using var client = new SmtpClient();
        await client.ConnectAsync(options.Host, options.Port, SecureSocketOptions.StartTlsWhenAvailable, ct);
        // Solo autentica si el servidor realmente anuncia algún mecanismo de AUTH -
        // relays internos/de prueba (ej. MailHog) no lo soportan, y llamar
        // AuthenticateAsync ahí igual lanza una excepción aunque nunca se necesitó.
        if (client.AuthenticationMechanisms.Count > 0)
        {
            await client.AuthenticateAsync(options.User, options.Password, ct);
        }
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
