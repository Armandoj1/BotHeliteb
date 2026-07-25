using Heliteb.Application.Abstractions;
using Heliteb.Application.Asesores;
using Heliteb.Application.Asesores.Dtos;
using Heliteb.Domain.Entities;

namespace Heliteb.Infrastructure.Asesores;

public class AsesorAuthService : IAsesorAuthService
{
    private readonly IAsesorRepository _asesores;
    private readonly IEmailService _email;

    public AsesorAuthService(IAsesorRepository asesores, IEmailService email)
    {
        _asesores = asesores;
        _email = email;
    }

    public async Task<EstadoAsesorDto> EstadoAsync(string telefono, CancellationToken ct = default)
    {
        var asesor = await _asesores.GetByTelefonoAsync(telefono, ct);
        if (asesor is null || !asesor.Activo)
        {
            return new EstadoAsesorDto { Registrado = false, Verificado = false };
        }

        var verificado = await _asesores.EstaVerificadoAsync(telefono, ct);
        return new EstadoAsesorDto { Registrado = true, Verificado = verificado, Nombre = asesor.Nombre };
    }

    public async Task SolicitarCodigoAsync(string telefono, CancellationToken ct = default)
    {
        var asesor = await _asesores.GetByTelefonoAsync(telefono, ct)
            ?? throw new InvalidOperationException($"Teléfono {telefono} no está registrado como asesor.");

        var codigo = Random.Shared.Next(0, 1_000_000).ToString("D6");
        var auth = await _asesores.GetAuthAsync(telefono, ct) ?? new AsesorAuth { Telefono = telefono };
        auth.AsesorId = asesor.Id;
        auth.Codigo = codigo;
        auth.CodigoExpira = DateTime.UtcNow.AddMinutes(10);
        auth.Intentos = 0;

        await _asesores.UpsertAuthAsync(auth, ct);
        await _email.SendCodigoOtpAsync(asesor.Email, codigo, ct);
    }

    public async Task<VerificarCodigoResultDto> VerificarCodigoAsync(string telefono, string codigo, CancellationToken ct = default)
    {
        var asesor = await _asesores.GetByTelefonoAsync(telefono, ct);
        var auth = await _asesores.GetAuthAsync(telefono, ct);
        if (asesor is null || auth is null)
        {
            return new VerificarCodigoResultDto { Ok = false, Motivo = "No hay un código solicitado para este teléfono." };
        }

        if (auth.CodigoExpira is null || auth.CodigoExpira < DateTime.UtcNow)
        {
            return new VerificarCodigoResultDto { Ok = false, Motivo = "El código expiró, solicita uno nuevo." };
        }

        if (!string.Equals(auth.Codigo, codigo, StringComparison.Ordinal))
        {
            auth.Intentos += 1;
            await _asesores.UpsertAuthAsync(auth, ct);
            return new VerificarCodigoResultDto { Ok = false, Motivo = "Código incorrecto." };
        }

        auth.VerificadoHasta = DateTime.UtcNow.AddHours(12);
        await _asesores.UpsertAuthAsync(auth, ct);

        return new VerificarCodigoResultDto { Ok = true, Nombre = asesor.Nombre };
    }
}
