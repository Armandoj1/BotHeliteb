using System.Net;
using System.Text;

namespace Heliteb.Infrastructure.Email;

/// <summary>Plantilla HTML minimalista compartida por los correos del sistema (OTP, cotización, alertas).</summary>
internal static class EmailTemplate
{
    private const string Accent = "#4f6ef7";
    private const string Text = "#111827";
    private const string Text2 = "#6b7280";
    private const string Border = "#e5e7eb";
    private const string Bg = "#f4f6fa";

    public static string Wrap(string preheader, string bodyHtml)
    {
        return $$"""
            <!doctype html>
            <html lang="es">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>HELITEB</title>
            </head>
            <body style="margin:0; padding:0; background:{{Bg}}; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <span style="display:none; font-size:1px; color:{{Bg}}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">{{WebUtility.HtmlEncode(preheader)}}</span>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{{Bg}}; padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 4px 16px rgba(17,24,39,.06);">
                      <tr>
                        <td style="padding:28px 32px 20px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:32px; height:32px; background:{{Accent}}; border-radius:8px; text-align:center; vertical-align:middle;">
                                <span style="color:#ffffff; font-weight:700; font-size:14px; line-height:32px;">H</span>
                              </td>
                              <td style="padding-left:10px; font-weight:700; font-size:15px; color:{{Text}};">HELITEB Panel</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 32px 28px; color:{{Text}}; font-size:14px; line-height:1.6;">
                          {{bodyHtml}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 32px; border-top:1px solid {{Border}}; color:{{Text2}}; font-size:11.5px;">
                          Este correo se generó automáticamente desde el panel de HELITEB SAS.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }

    public static string Otp(string codigo)
    {
        var body = $"""
            <p style="margin:0 0 16px; color:{Text2};">Tu código de verificación para ingresar al panel:</p>
            <div style="background:{Bg}; border-radius:10px; padding:18px; text-align:center; margin-bottom:16px;">
              <span style="font-size:28px; font-weight:700; letter-spacing:6px; color:{Text};">{WebUtility.HtmlEncode(codigo)}</span>
            </div>
            <p style="margin:0; color:{Text2}; font-size:13px;">Vigente por 10 minutos. Si no lo solicitaste, ignora este correo.</p>
            """;
        return Wrap($"Tu código de verificación es {codigo}", body);
    }

    public static string Cotizacion(string folio)
    {
        var body = $"""
            <p style="margin:0 0 6px; color:{Text2};">Cotización</p>
            <p style="margin:0 0 16px; font-size:20px; font-weight:700; color:{Text};">{WebUtility.HtmlEncode(folio)}</p>
            <p style="margin:0; color:{Text2};">Adjuntamos el PDF con el detalle de productos y precios.</p>
            """;
        return Wrap($"Tu cotización {folio} está adjunta", body);
    }

    public static string Alerta(string cuerpo)
    {
        var sb = new StringBuilder();
        foreach (var lineaRaw in cuerpo.Replace("\r\n", "\n").Split('\n'))
        {
            var linea = WebUtility.HtmlEncode(lineaRaw);
            if (lineaRaw.TrimStart().StartsWith("+ "))
            {
                sb.Append($"""<div style="font-family:ui-monospace,monospace; font-size:12.5px; color:#16a34a; background:rgba(22,163,74,.06); padding:2px 8px; border-radius:4px; margin-bottom:2px;">{linea}</div>""");
            }
            else if (lineaRaw.TrimStart().StartsWith("- "))
            {
                sb.Append($"""<div style="font-family:ui-monospace,monospace; font-size:12.5px; color:#dc2626; background:rgba(220,38,38,.06); padding:2px 8px; border-radius:4px; margin-bottom:2px;">{linea}</div>""");
            }
            else if (lineaRaw.Trim().Length == 0)
            {
                sb.Append("<div style=\"height:8px;\"></div>");
            }
            else if (lineaRaw.EndsWith(':') || lineaRaw == lineaRaw.ToUpperInvariant())
            {
                sb.Append($"""<p style="margin:0 0 6px; font-weight:700; color:{Text};">{linea}</p>""");
            }
            else
            {
                sb.Append($"""<p style="margin:0 0 6px; color:{Text2};">{linea}</p>""");
            }
        }
        return Wrap(cuerpo.Split('\n')[0], sb.ToString());
    }
}
