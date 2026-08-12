using Heliteb.Application.Agent;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class CrearNotaRequest
{
    public string Contenido { get; set; } = null!;

    /// <summary>
    /// "whatsapp" (cliente final), "escritorio" (asesor en el panel) o null para
    /// los dos. Deja afinar al vendedor sin tocarle el comportamiento al
    /// asistente interno, que es lo que se pidio desde el panel.
    /// </summary>
    public string? Canal { get; set; }
}

/// <summary>
/// Notas de negocio editables sin código: se inyectan en el system prompt del
/// agente (ver SystemPrompt.BuildNotasSection). Permiten darle feedback al bot
/// ("siempre menciona la garantía de 1 año") sin tocar el código ni redesplegar.
/// </summary>
[ApiController]
[Route("api/agente-notas")]
public class AgentNotasController : ControllerBase
{
    private readonly IAgentNotasRepository _notas;

    public AgentNotasController(IAgentNotasRepository notas)
    {
        _notas = notas;
    }

    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken ct) => Ok(await _notas.ListAllAsync(ct));

    private static readonly string[] CanalesValidos = { "whatsapp", "escritorio" };

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearNotaRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Contenido))
        {
            return BadRequest(new { ok = false, motivo = "El contenido es obligatorio." });
        }

        var canal = string.IsNullOrWhiteSpace(request.Canal) ? null : request.Canal.Trim().ToLowerInvariant();
        if (canal is not null && !CanalesValidos.Contains(canal))
        {
            return BadRequest(new { ok = false, motivo = "canal debe ser 'whatsapp', 'escritorio' o venir vacio." });
        }

        return Ok(await _notas.CreateAsync(request.Contenido, canal, ct));
    }

    [HttpPatch("{id:int}/desactivar")]
    public async Task<IActionResult> Desactivar(int id, CancellationToken ct)
    {
        await _notas.SetActivoAsync(id, false, ct);
        return Ok(new { ok = true });
    }

    [HttpPatch("{id:int}/activar")]
    public async Task<IActionResult> Activar(int id, CancellationToken ct)
    {
        await _notas.SetActivoAsync(id, true, ct);
        return Ok(new { ok = true });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        await _notas.DeleteAsync(id, ct);
        return Ok(new { ok = true });
    }
}
