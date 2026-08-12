using Dapper;
using Heliteb.Application.Agent;
using Heliteb.Domain.Entities;
using Microsoft.Extensions.Caching.Memory;

namespace Heliteb.Infrastructure.Data.Repositories;

public class AgentNotasRepository : IAgentNotasRepository
{
    // Las notas se leen en cada turno del agente (AgentOrchestrator) pero solo cambian
    // cuando alguien las edita desde el panel — cachear evita un SELECT por mensaje.
    private const string CacheKeyPrefijo = "agente_notas:activas:";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly INpgsqlConnectionFactory _connectionFactory;
    private readonly IMemoryCache _cache;

    public AgentNotasRepository(INpgsqlConnectionFactory connectionFactory, IMemoryCache cache)
    {
        _connectionFactory = connectionFactory;
        _cache = cache;
    }

    public async Task<IReadOnlyList<AgenteNota>> GetActivasAsync(string? canal = null, CancellationToken ct = default)
    {
        var clave = CacheKeyPrefijo + (canal ?? "todos");
        if (_cache.TryGetValue(clave, out IReadOnlyList<AgenteNota>? cached) && cached is not null)
        {
            return cached;
        }

        using var conn = _connectionFactory.Create();
        // canal NULL = la nota aplica a todos los canales.
        var rows = await conn.QueryAsync<AgenteNota>("""
            SELECT id AS "Id", contenido AS "Contenido", activo AS "Activo",
                   canal AS "Canal", created_at AS "CreatedAt"
            FROM agente_notas
            WHERE activo = TRUE AND (canal IS NULL OR canal = @Canal)
            ORDER BY created_at
            """, new { Canal = canal });
        var list = rows.AsList();
        _cache.Set(clave, (IReadOnlyList<AgenteNota>)list, CacheTtl);
        return list;
    }

    public async Task<IReadOnlyList<AgenteNota>> ListAllAsync(CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<AgenteNota>("""
            SELECT id AS "Id", contenido AS "Contenido", activo AS "Activo",
                   canal AS "Canal", created_at AS "CreatedAt"
            FROM agente_notas ORDER BY created_at DESC
            """);
        return rows.AsList();
    }

    public async Task<AgenteNota> CreateAsync(string contenido, string? canal = null, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var id = await conn.ExecuteScalarAsync<int>(
            "INSERT INTO agente_notas (contenido, canal) VALUES (@Contenido, @Canal) RETURNING id",
            new { Contenido = contenido, Canal = canal });
        LimpiarCache();
        return new AgenteNota { Id = id, Contenido = contenido, Canal = canal, Activo = true, CreatedAt = DateTime.UtcNow };
    }

    // Se invalidan las tres variantes: una nota sin canal afecta a todas.
    private void LimpiarCache()
    {
        foreach (var c in new[] { "todos", "whatsapp", "escritorio" })
        {
            _cache.Remove(CacheKeyPrefijo + c);
        }
    }

    public async Task SetActivoAsync(int id, bool activo, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("UPDATE agente_notas SET activo = @Activo WHERE id = @Id", new { Id = id, Activo = activo });
        LimpiarCache();
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("DELETE FROM agente_notas WHERE id = @Id", new { Id = id });
        LimpiarCache();
    }
}
