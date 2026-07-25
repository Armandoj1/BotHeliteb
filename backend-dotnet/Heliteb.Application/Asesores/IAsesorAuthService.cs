using Heliteb.Application.Asesores.Dtos;

namespace Heliteb.Application.Asesores;

public interface IAsesorAuthService
{
    Task<EstadoAsesorDto> EstadoAsync(string telefono, CancellationToken ct = default);

    /// <summary>Genera un OTP de 6 dígitos (10 min de vigencia) y lo envía por email.</summary>
    Task SolicitarCodigoAsync(string telefono, CancellationToken ct = default);

    /// <summary>Valida el OTP; si es correcto, marca verificado_hasta = now()+12h.</summary>
    Task<VerificarCodigoResultDto> VerificarCodigoAsync(string telefono, string codigo, CancellationToken ct = default);
}
