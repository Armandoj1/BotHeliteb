using Heliteb.Application.Asesores;
using Heliteb.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class VerificarCodigoRequest
{
    public string Codigo { get; set; } = null!;
}

public class LoginRequest
{
    public string Correo { get; set; } = null!;
    public string Password { get; set; } = null!;
}

public class CambiarPasswordRequest
{
    public string PasswordActual { get; set; } = null!;
    public string PasswordNueva { get; set; } = null!;
}

public class ActualizarPerfilRequest
{
    public string Nombre { get; set; } = null!;
    public string Email { get; set; } = null!;
}

/// <summary>
/// Login del panel: reusa el OTP por WhatsApp que ya existía para el bot (asesor_auth),
/// pero además emite un JWT al verificar correctamente - el bot nunca necesitó esto (el
/// teléfono le llega del contexto de la conversación), el panel web sí necesita sesión real.
///
/// OJO: [AllowAnonymous] se pone por método, NO a nivel de clase - un [AllowAnonymous] de
/// clase gana sobre cualquier [Authorize] de método dentro de la misma clase (comportamiento
/// documentado de ASP.NET Core), lo que dejaría /me sin protección real si se pusiera arriba.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAsesorAuthService _auth;
    private readonly IAsesorRepository _asesores;
    private readonly IJwtTokenService _jwt;
    private readonly IPasswordHasher _passwords;

    public AuthController(
        IAsesorAuthService auth, IAsesorRepository asesores, IJwtTokenService jwt, IPasswordHasher passwords)
    {
        _auth = auth;
        _asesores = asesores;
        _jwt = jwt;
        _passwords = passwords;
    }

    /// <summary>
    /// Login del panel por correo + contraseña. Emite el MISMO JWT que la ruta OTP,
    /// así que todo lo que ya validaba el token sigue funcionando sin cambios.
    ///
    /// Correo inexistente, asesor inactivo, sin contraseña definida y contraseña
    /// incorrecta devuelven exactamente el mismo mensaje: distinguirlos permitiría
    /// enumerar qué correos están registrados.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        const string CredencialesInvalidas = "Correo o contraseña incorrectos.";

        if (string.IsNullOrWhiteSpace(request.Correo) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { ok = false, motivo = "Correo y contraseña son obligatorios." });
        }

        var asesor = await _asesores.GetByEmailAsync(request.Correo.Trim(), ct);

        // Se verifica igual aunque el asesor no exista, para que el tiempo de
        // respuesta no delate qué correos están registrados.
        var passwordOk = _passwords.Verify(request.Password, asesor?.PasswordHash);

        if (asesor is null || !asesor.Activo || !passwordOk)
        {
            return Unauthorized(new { ok = false, motivo = CredencialesInvalidas });
        }

        return Ok(new
        {
            ok = true,
            token = _jwt.GenerarToken(asesor),
            asesor = new { asesor.Id, asesor.Nombre, asesor.Email, asesor.Telefono },
        });
    }

    /// <summary>Cambio de contraseña del propio asesor; exige la contraseña actual.</summary>
    [HttpPost("cambiar-password")]
    public async Task<IActionResult> CambiarPassword([FromBody] CambiarPasswordRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.PasswordNueva) || request.PasswordNueva.Length < 8)
        {
            return BadRequest(new { ok = false, motivo = "La contraseña nueva debe tener al menos 8 caracteres." });
        }

        var telefono = User.FindFirst("phone")?.Value ?? "";
        var asesor = await _asesores.GetByTelefonoAsync(telefono, ct);
        if (asesor is null)
        {
            return Unauthorized(new { ok = false, motivo = "Asesor no encontrado." });
        }

        if (!_passwords.Verify(request.PasswordActual, asesor.PasswordHash))
        {
            return Unauthorized(new { ok = false, motivo = "La contraseña actual no coincide." });
        }

        await _asesores.SetPasswordHashAsync(asesor.Id, _passwords.Hash(request.PasswordNueva), ct);
        return Ok(new { ok = true });
    }

    [AllowAnonymous]
    [HttpGet("estado")]
    public async Task<IActionResult> Estado([FromQuery] string telefono, CancellationToken ct) =>
        Ok(await _auth.EstadoAsync(telefono, ct));

    [AllowAnonymous]
    [HttpPost("solicitar-codigo")]
    public async Task<IActionResult> SolicitarCodigo([FromQuery] string telefono, CancellationToken ct)
    {
        try
        {
            await _auth.SolicitarCodigoAsync(telefono, ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            // Telefono no registrado como asesor - error esperado del usuario, no un 500.
            return Unauthorized(new { ok = false, motivo = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("verificar-codigo")]
    public async Task<IActionResult> VerificarCodigo(
        [FromQuery] string telefono, [FromBody] VerificarCodigoRequest request, CancellationToken ct)
    {
        var resultado = await _auth.VerificarCodigoAsync(telefono, request.Codigo, ct);
        if (!resultado.Ok)
        {
            return Unauthorized(new { ok = false, motivo = resultado.Motivo });
        }

        var asesor = await _asesores.GetByTelefonoAsync(telefono, ct);
        if (asesor is null)
        {
            return Unauthorized(new { ok = false, motivo = "Asesor no encontrado." });
        }

        var token = _jwt.GenerarToken(asesor);
        return Ok(new
        {
            ok = true,
            token,
            asesor = new { asesor.Id, asesor.Nombre, asesor.Telefono },
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var telefono = User.FindFirst("phone")?.Value ?? "";
        var asesor = await _asesores.GetByTelefonoAsync(telefono, ct);
        if (asesor is null)
        {
            return Unauthorized(new { ok = false, motivo = "Asesor no encontrado." });
        }

        var verificado = await _asesores.EstaVerificadoAsync(telefono, ct);
        return Ok(new
        {
            asesor.Id,
            asesor.Nombre,
            asesor.Email,
            asesor.Telefono,
            asesor.Activo,
            asesor.CreatedAt,
            verificado,
        });
    }

    [HttpPatch("me")]
    public async Task<IActionResult> ActualizarMe([FromBody] ActualizarPerfilRequest request, CancellationToken ct)
    {
        var telefono = User.FindFirst("phone")?.Value ?? "";
        if (string.IsNullOrWhiteSpace(request.Nombre) || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { ok = false, motivo = "Nombre y correo son obligatorios." });
        }

        // El telefono nunca se edita aqui - es la identidad de login/OTP (asesor_auth,
        // el JWT, y todo lo que el bot ya asocio a ese numero dependen de que no cambie).
        await _asesores.UpdateNombreEmailAsync(telefono, request.Nombre.Trim(), request.Email.Trim(), ct);
        return await Me(ct);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public IActionResult Logout() => Ok(new { ok = true });
}
