using Heliteb.Application.Asesores;
using Heliteb.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class CrearAsesorRequest
{
    public string Nombre { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Telefono { get; set; } = null!;
}

/// <summary>
/// CRUD de asesores comerciales. El flujo de login/OTP (estado, solicitar-codigo,
/// verificar-codigo) vive en AuthController - este controller quedó protegido por
/// la FallbackPolicy (requiere sesión de asesor) igual que el resto del panel.
/// </summary>
[ApiController]
[Route("api")]
public class AsesoresController : ControllerBase
{
    private readonly IAsesorRepository _asesores;

    public AsesoresController(IAsesorRepository asesores)
    {
        _asesores = asesores;
    }

    [HttpGet("asesores")]
    public async Task<IActionResult> Listar(CancellationToken ct) => Ok(await _asesores.ListAsync(ct));

    [HttpPost("asesores")]
    public async Task<IActionResult> Crear([FromBody] CrearAsesorRequest request, CancellationToken ct)
    {
        var asesor = await _asesores.CreateAsync(new Asesor
        {
            Nombre = request.Nombre,
            Email = request.Email,
            Telefono = request.Telefono,
            Activo = true,
        }, ct);
        return Ok(asesor);
    }

    [HttpDelete("asesores/{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        await _asesores.DeleteAsync(id, ct);
        return Ok(new { ok = true });
    }
}
