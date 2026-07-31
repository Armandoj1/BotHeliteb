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
        await _asesores.DeleteAsync(id, ct);
        return Ok(new { ok = true });
    }

    private static string GenerarPasswordTemporal()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(18))
            .Replace("/", "").Replace("+", "").Replace("=", "");
    }
}
