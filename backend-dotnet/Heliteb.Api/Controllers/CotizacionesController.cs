using Heliteb.Application.Cotizaciones;
using Heliteb.Application.Cotizaciones.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class EnviarCotizacionRequest
{
    public string Destino { get; set; } = null!;
}

[ApiController]
[Route("api")]
public class CotizacionesController : ControllerBase
{
    private readonly ICotizacionService _cotizaciones;

    public CotizacionesController(ICotizacionService cotizaciones)
    {
        _cotizaciones = cotizaciones;
    }

    [HttpPost("cotizacion")]
    public async Task<IActionResult> Crear([FromBody] GenerarCotizacionRequest request, CancellationToken ct)
    {
        try
        {
            var resultado = await _cotizaciones.GenerarAsync(request, ct);
            return Ok(resultado);
        }
        catch (AsesorNoVerificadoException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    [HttpGet("cotizaciones")]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var cotizaciones = await _cotizaciones.ListAsync(ct);
        return Ok(cotizaciones);
    }

    [HttpGet("cotizacion/{folio}/pdf")]
    public async Task<IActionResult> ObtenerPdf(string folio, CancellationToken ct)
    {
        var cotizacion = await _cotizaciones.GetByFolioAsync(folio, ct);
        if (cotizacion is null) return NotFound();
        return Redirect(cotizacion.PdfUrl);
    }

    [HttpPost("cotizacion/{folio}/email")]
    public async Task<IActionResult> EnviarPorEmail(string folio, [FromBody] EnviarCotizacionRequest request, CancellationToken ct)
    {
        await _cotizaciones.EnviarPorEmailAsync(folio, request.Destino, ct);
        return Ok(new { ok = true });
    }

    [HttpPost("cotizacion/{folio}/whatsapp")]
    public async Task<IActionResult> EnviarPorWhatsApp(string folio, [FromBody] EnviarCotizacionRequest request, CancellationToken ct)
    {
        await _cotizaciones.EnviarPorWhatsAppAsync(folio, request.Destino, ct);
        return Ok(new { ok = true });
    }
}
