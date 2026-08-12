using Heliteb.Domain.Entities;

namespace Heliteb.Application.Agent;

/// <summary>
/// CRUD de las notas de negocio editables sin código (ver AgenteNota) que se
/// inyectan en el system prompt del agente.
/// </summary>
public interface IAgentNotasRepository
{
    /// <summary>Notas activas del canal indicado mas las que aplican a todos.</summary>
    Task<IReadOnlyList<AgenteNota>> GetActivasAsync(string? canal = null, CancellationToken ct = default);

    Task<IReadOnlyList<AgenteNota>> ListAllAsync(CancellationToken ct = default);

    Task<AgenteNota> CreateAsync(string contenido, string? canal = null, CancellationToken ct = default);

    Task SetActivoAsync(int id, bool activo, CancellationToken ct = default);

    Task DeleteAsync(int id, CancellationToken ct = default);
}
