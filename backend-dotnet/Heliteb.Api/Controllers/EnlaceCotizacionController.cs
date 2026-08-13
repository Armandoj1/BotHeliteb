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

        return Redirect(cotizacion.PdfUrl);
    }
}
