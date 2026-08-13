using Heliteb.Infrastructure.Data.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

/// <summary>
/// Enlace publico y corto del PDF de una cotizacion: /c/{token}.
///
/// Existe para no mandarle al cliente la URL cruda de Cloudinary, que revela el
/// proveedor, el nombre de la cuenta y la carpeta, y ademas es larguisima en un
/// chat de WhatsApp. El token es aleatorio: el folio lleva marca de tiempo y se
/// podria enumerar para leer cotizaciones de otros clientes.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("c")]
public class EnlaceCotizacionController : ControllerBase
{
    // Estatico a proposito: un HttpClient por peticion agota los sockets.
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(20) };

    private readonly CotizacionRepository _cotizaciones;

    public EnlaceCotizacionController(CotizacionRepository cotizaciones)
    {
        _cotizaciones = cotizaciones;
    }

    [HttpGet("{token}")]
    public async Task<IActionResult> Abrir(string token, CancellationToken ct)
    {
        var cotizacion = await _cotizaciones.GetByTokenAsync(token, ct);
        if (cotizacion is null || string.IsNullOrWhiteSpace(cotizacion.PdfUrl))
        {
            return NotFound();
        }

        // Se entrega el archivo desde aqui en vez de redirigir: asi va con
        // Content-Type de PDF y un nombre legible (redirigiendo llegaba como
        // application/octet-stream sin extension y no abria), y Cloudinary no
        // aparece ni siquiera en la barra de direcciones.
        try
        {
            var bytes = await Http.GetByteArrayAsync(cotizacion.PdfUrl, ct);

            // inline y no attachment: en el telefono, adjunto obliga a bajarlo y
            // buscarlo en el gestor de descargas; asi se abre en el visor.
            Response.Headers.ContentDisposition =
                $"inline; filename=\"{cotizacion.Folio}.pdf\"";

            return File(bytes, "application/pdf");
        }
        catch (Exception)
        {
            // Si el almacenamiento no responde, es preferible mandar al cliente
            // al archivo original que dejarlo sin nada.
            return Redirect(cotizacion.PdfUrl);
        }
    }
}
