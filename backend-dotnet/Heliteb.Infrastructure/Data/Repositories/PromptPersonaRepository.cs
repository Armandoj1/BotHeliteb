using Dapper;
using Heliteb.Application.Agent;
using Microsoft.Extensions.Caching.Memory;

namespace Heliteb.Infrastructure.Data.Repositories;

public class PromptPersonaRepository : IPromptPersonaRepository
{
    // Se lee en cada turno del agente (AgentOrchestrator) pero solo cambia cuando
    // alguien la edita desde el panel - mismo criterio que AgentNotasRepository.
    private const string CacheKeyPrefijo = "prompt_persona:";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly INpgsqlConnectionFactory _connectionFactory;
    private readonly IMemoryCache _cache;

    public PromptPersonaRepository(INpgsqlConnectionFactory connectionFactory, IMemoryCache cache)
    {
        _connectionFactory = connectionFactory;
        _cache = cache;
    }

    public async Task<string?> GetAsync(string canal, CancellationToken ct = default)
    {
        var clave = CacheKeyPrefijo + canal;
        if (_cache.TryGetValue(clave, out string? cached))
        {
            return cached;
        }

        using var conn = _connectionFactory.Create();
        var contenido = await conn.QueryFirstOrDefaultAsync<string?>(
            "SELECT contenido FROM prompt_persona WHERE canal = @Canal", new { Canal = canal });
        _cache.Set(clave, contenido, CacheTtl);
        return contenido;
    }

    public async Task SetAsync(string canal, string contenido, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("""
            INSERT INTO prompt_persona (canal, contenido, actualizado_en) VALUES (@Canal, @Contenido, now())
            ON CONFLICT (canal) DO UPDATE SET contenido = EXCLUDED.contenido, actualizado_en = now()
            """, new { Canal = canal, Contenido = contenido });
        _cache.Remove(CacheKeyPrefijo + canal);
    }

    public async Task RestaurarAsync(string canal, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("DELETE FROM prompt_persona WHERE canal = @Canal", new { Canal = canal });
        _cache.Remove(CacheKeyPrefijo + canal);
    }
}
