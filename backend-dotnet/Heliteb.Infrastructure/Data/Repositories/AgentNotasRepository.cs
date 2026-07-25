using Dapper;
using Heliteb.Application.Agent;
using Heliteb.Domain.Entities;
using Microsoft.Extensions.Caching.Memory;

namespace Heliteb.Infrastructure.Data.Repositories;

public class AgentNotasRepository : IAgentNotasRepository
{
    // Las notas se leen en cada turno del agente (AgentOrchestrator) pero solo cambian
    // cuando alguien las edita desde el panel — cachear evita un SELECT por mensaje.
    private const string CacheKey = "agente_notas:activas";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly INpgsqlConnectionFactory _connectionFactory;
    private readonly IMemoryCache _cache;

    public AgentNotasRepository(INpgsqlConnectionFactory connectionFactory, IMemoryCache cache)
    {
        _connectionFactory = connectionFactory;
        _cache = cache;
    }

    public async Task<IReadOnlyList<AgenteNota>> GetActivasAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out IReadOnlyList<AgenteNota>? cached) && cached is not null)
        {
            return cached;
        }

        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<AgenteNota>("""
            SELECT id AS "Id", contenido AS "Contenido", activo AS "Activo", created_at AS "CreatedAt"
            FROM agente_notas WHERE activo = TRUE ORDER BY created_at
            """);
        var list = rows.AsList();
        _cache.Set(CacheKey, (IReadOnlyList<AgenteNota>)list, CacheTtl);
        return list;
    }

    public async Task<IReadOnlyList<AgenteNota>> ListAllAsync(CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<AgenteNota>("""
            SELECT id AS "Id", contenido AS "Contenido", activo AS "Activo", created_at AS "CreatedAt"
            FROM agente_notas ORDER BY created_at DESC
            """);
        return rows.AsList();
    }

    public async Task<AgenteNota> CreateAsync(string contenido, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var id = await conn.ExecuteScalarAsync<int>(
            "INSERT INTO agente_notas (contenido) VALUES (@Contenido) RETURNING id",
            new { Contenido = contenido });
        _cache.Remove(CacheKey);
        return new AgenteNota { Id = id, Contenido = contenido, Activo = true, CreatedAt = DateTime.UtcNow };
    }

    public async Task SetActivoAsync(int id, bool activo, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("UPDATE agente_notas SET activo = @Activo WHERE id = @Id", new { Id = id, Activo = activo });
        _cache.Remove(CacheKey);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("DELETE FROM agente_notas WHERE id = @Id", new { Id = id });
        _cache.Remove(CacheKey);
    }
}
