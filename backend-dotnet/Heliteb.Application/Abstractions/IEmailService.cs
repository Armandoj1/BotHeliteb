namespace Heliteb.Application.Abstractions;

public interface IEmailService
{
    Task SendCotizacionAsync(string destinatario, string folio, byte[] pdfBytes, CancellationToken ct = default);

    Task SendCodigoOtpAsync(string destinatario, string codigo, CancellationToken ct = default);

    Task SendAlertaAsync(string destinatario, string asunto, string cuerpo, CancellationToken ct = default);
}
