using Heliteb.Agent;
using Heliteb.Application.Agent;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class GuardarPromptPersonaRequest
{
    public string Contenido { get; set; } = null!;
    public string? Canal { get; set; }
}

/// <summary>
/// Persona/estilo de venta del agente, editable desde el panel sin tocar codigo
/// (ver SystemPrompt.BuildVendedorSection e IPromptPersonaRepository). Las reglas
/// tecnicas del prompt (marca [REF], flujo de cotizacion) NO se exponen aqui a
/// proposito: viven fijas en el codigo para que no se puedan romper por accidente.
/// </summary>
[ApiController]
[Route("api/prompt-persona")]
public class PromptPersonaController : ControllerBase
{
    private static readonly string[] CanalesValidos = { "whatsapp" };

    private readonly IPromptPersonaRepository _repo;

    public PromptPersonaController(IPromptPersonaRepository repo)
    {
        _repo = repo;
    }

    [HttpGet]
    public async Task<IActionResult> Obtener([FromQuery] string canal = "whatsapp", CancellationToken ct = default)
    {
        canal = NormalizarCanal(canal);
        var guardado = await _repo.GetAsync(canal, ct);
        return Ok(new
        {
            canal,
            contenido = guardado ?? SystemPrompt.PersonaVendedorPorDefecto,
            personalizado = guardado is not null,
            contenido_por_defecto = SystemPrompt.PersonaVendedorPorDefecto,
        });
    }

    [HttpPut]
    public async Task<IActionResult> Guardar([FromBody] GuardarPromptPersonaRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Contenido))
        {
            return BadRequest(new { ok = false, motivo = "El contenido es obligatorio." });
        }

        var canal = NormalizarCanal(request.Canal);
        if (!CanalesValidos.Contains(canal))
        {
            return BadRequest(new { ok = false, motivo = "canal debe ser 'whatsapp'." });
        }

        await _repo.SetAsync(canal, request.Contenido.Trim(), ct);
        return Ok(new { ok = true });
    }

    [HttpDelete]
    public async Task<IActionResult> Restaurar([FromQuery] string canal = "whatsapp", CancellationToken ct = default)
    {
        await _repo.RestaurarAsync(NormalizarCanal(canal), ct);
        return Ok(new { ok = true, contenido = SystemPrompt.PersonaVendedorPorDefecto });
    }

    private static string NormalizarCanal(string? canal) =>
        string.IsNullOrWhiteSpace(canal) ? "whatsapp" : canal.Trim().ToLowerInvariant();
}
