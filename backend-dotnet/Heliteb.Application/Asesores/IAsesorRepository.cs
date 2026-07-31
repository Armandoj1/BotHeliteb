using Heliteb.Application.Asesores.Dtos;
using Heliteb.Domain.Entities;

namespace Heliteb.Application.Asesores;

public interface IAsesorRepository
{
    Task<IReadOnlyList<AsesorListItemDto>> ListAsync(CancellationToken ct = default);

    Task<Asesor?> GetByTelefonoAsync(string telefono, CancellationToken ct = default);

    /// <summary>Login del panel: el correo es el identificador de ingreso (case-insensitive).</summary>
    Task<Asesor?> GetByEmailAsync(string email, CancellationToken ct = default);

    Task SetPasswordHashAsync(int asesorId, string passwordHash, CancellationToken ct = default);

    Task<Asesor> CreateAsync(Asesor asesor, CancellationToken ct = default);

    /// <summary>Autoedicion del propio perfil - nunca cambia telefono (es la identidad de login/OTP).</summary>
    Task UpdateNombreEmailAsync(string telefono, string nombre, string email, CancellationToken ct = default);

    Task DeleteAsync(int id, CancellationToken ct = default);

    Task<AsesorAuth?> GetAuthAsync(string telefono, CancellationToken ct = default);

    Task UpsertAuthAsync(AsesorAuth auth, CancellationToken ct = default);

    /// <summary>True si el teléfono corresponde a un asesor activo con OTP vigente (verificado_hasta > now()).</summary>
    Task<bool> EstaVerificadoAsync(string telefono, CancellationToken ct = default);
}
