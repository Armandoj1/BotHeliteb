using Heliteb.Application.Agent.Dtos;
using Heliteb.Domain.Entities;

namespace Heliteb.Application.Agent;

/// <summary>
/// Información de negocio (contactos, sedes, medios de pago, garantías) consultada
/// bajo demanda por el agente — a diferencia de agente_notas, no se inyecta fija en
/// el system prompt, así que su volumen no infla tokens en cada turno.
/// </summary>
public interface IInformacionEmpresaRepository
{
    Task<IReadOnlyList<ContactoEmpresa>> BuscarContactosAsync(string? area = null, CancellationToken ct = default);

    Task<IReadOnlyList<Sede>> BuscarSedesAsync(string? ciudad = null, CancellationToken ct = default);

    /// <summary>Asesor(es) comercial(es) de referencia en una sede física — a quién debe acercarse el cliente presencialmente.</summary>
    Task<IReadOnlyList<AsesorSede>> BuscarAsesoresSedeAsync(string? ciudad = null, CancellationToken ct = default);

    Task<IReadOnlyList<MedioPago>> GetMediosPagoAsync(CancellationToken ct = default);

    Task<IReadOnlyList<Garantia>> BuscarGarantiasAsync(string? marca = null, string? tipoProducto = null, CancellationToken ct = default);

    Task<IReadOnlyList<GarantiaPolitica>> BuscarPoliticasAsync(string? categoria = null, CancellationToken ct = default);

    /// <summary>
    /// Sincroniza sedes desde el Sheet: agrega las nuevas, actualiza el telefono de las
    /// existentes (match por ciudad+direccion, sin distinguir mayusculas/espacios), y
    /// NUNCA borra - una sede que ya no aparece en el Sheet solo se reporta en
    /// <see cref="SedesSyncResultDto.NoEncontradasEnSheet"/> para revision manual.
    /// </summary>
    Task<SedesSyncResultDto> SincronizarSedesAsync(IReadOnlyList<SedeSyncItem> sedesDelSheet, CancellationToken ct = default);
}
