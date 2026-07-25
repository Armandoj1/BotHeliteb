using Heliteb.Application.Agent;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class CrearNotaRequest
{
    public string Contenido { get; set; } = null!;
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

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearNotaRequest request, CancellationToken ct) =>
        Ok(await _notas.CreateAsync(request.Contenido, ct));

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
