using Heliteb.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

/// <summary>
/// Visor de historial de conversaciones de WhatsApp para el panel (protegido por la
/// FallbackPolicy - requiere sesión de asesor, igual que el resto de endpoints del panel).
/// </summary>
[ApiController]
[Route("api/conversaciones")]
public class ConversacionesController : ControllerBase
{
    private readonly IConversationStore _conversaciones;

    public ConversacionesController(IConversationStore conversaciones)
    {
        _conversaciones = conversaciones;
    }

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 30, CancellationToken ct = default) =>
        Ok(await _conversaciones.ListConversacionesAsync(search, page, pageSize, ct));

    [HttpGet("{telefono}/mensajes")]
    public async Task<IActionResult> Mensajes(
        string telefono, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var resultado = await _conversaciones.GetHistorialCompletoAsync(telefono, page, pageSize, ct);
        if (resultado.Total == 0 && page == 1) return NotFound();
        return Ok(resultado);
    }
}
