using System.Security.Cryptography;
using Heliteb.Application.Asesores;
using Heliteb.Application.Auth;
using Heliteb.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
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
/// la FallbackPolicy (requiere sesión de asesor) igual que el resto del panel, y
/// "AdminOnly" además en Crear/Eliminar: un asesor cualquiera no debería poder
/// crear o borrar cuentas de otros asesores.
/// </summary>
[ApiController]
[Route("api")]
public class AsesoresController : ControllerBase
{
    private readonly IAsesorRepository _asesores;
    private readonly IPasswordHasher _passwords;

    public AsesoresController(IAsesorRepository asesores, IPasswordHasher passwords)
    {
        _asesores = asesores;
        _passwords = passwords;
    }

    [HttpGet("asesores")]
    public async Task<IActionResult> Listar(CancellationToken ct) => Ok(await _asesores.ListAsync(ct));

    /// <summary>
    /// Genera una contraseña temporal fuerte y la devuelve en texto plano UNA sola
    /// vez en la respuesta - nunca se guarda en claro ni se vuelve a poder consultar,
    /// así que quien crea el asesor debe copiarla y compartirla de inmediato.
    /// </summary>
    [HttpPost("asesores"), Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Crear([FromBody] CrearAsesorRequest request, CancellationToken ct)
    {
        var passwordTemporal = GenerarPasswordTemporal();

        var asesor = await _asesores.CreateAsync(new Asesor
        {
            Nombre = request.Nombre,
            Email = request.Email,
            Telefono = request.Telefono,
            PasswordHash = _passwords.Hash(passwordTemporal),
            Rol = "asesor",
            Activo = true,
        }, ct);

        return Ok(new
        {
            // Nunca el hash: no hace falta exponerlo por la red aunque no sea texto plano.
            asesor = new { asesor.Id, asesor.Nombre, asesor.Email, asesor.Telefono, asesor.Rol, asesor.Activo },
            password_temporal = passwordTemporal,
        });
    }

    [HttpDelete("asesores/{id:int}"), Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        var asesor = await _asesores.GetByIdAsync(id, ct);
        if (asesor is null)
        {
            return NotFound(new { ok = false, motivo = "Ese asesor ya no existe." });
        }

        // Borrarse a uno mismo deja la cuenta sin dueño y, si es el único
        // administrador, nadie puede volver a crear ni borrar asesores nunca más:
        // la política AdminOnly exige el claim 'role=admin' y ya no lo tendría nadie.
        var propioId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;
        if (int.TryParse(propioId, out var idActual) && idActual == id)
        {
            return BadRequest(new { ok = false, motivo = "No puedes eliminar tu propia cuenta." });
        }

        if (string.Equals(asesor.Rol, "admin", StringComparison.OrdinalIgnoreCase))
        {
            var admins = (await _asesores.ListAsync(ct))
                .Count(a => string.Equals(a.Rol, "admin", StringComparison.OrdinalIgnoreCase));
            if (admins <= 1)
            {
                return BadRequest(new
                {
                    ok = false,
                    motivo = "Es el único administrador. Nombra otro antes de eliminarlo.",
                });
            }
        }

        await _asesores.DeleteAsync(id, ct);
        return Ok(new { ok = true });
    }

    private static string GenerarPasswordTemporal()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(18))
            .Replace("/", "").Replace("+", "").Replace("=", "");
    }
}
