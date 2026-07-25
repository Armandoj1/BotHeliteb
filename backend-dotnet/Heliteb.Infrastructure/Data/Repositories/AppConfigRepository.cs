using Dapper;
using Heliteb.Application.Abstractions;
using Heliteb.Infrastructure.Data;

namespace Heliteb.Infrastructure.Data.Repositories;

public class AppConfigRepository : IAppConfigStore
{
    private readonly INpgsqlConnectionFactory _connectionFactory;

    public AppConfigRepository(INpgsqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<string?> GetAsync(string clave, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        // valor es jsonb (no text) - se castea a texto para no depender de que Npgsql
        // tenga habilitado el mapeo dinamico de jsonb.
        return await conn.QueryFirstOrDefaultAsync<string?>(
            "SELECT valor::text FROM app_config WHERE clave = @Clave", new { Clave = clave });
    }

    public async Task SetAsync(string clave, string valor, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("""
            INSERT INTO app_config (clave, valor, actualizado) VALUES (@Clave, @Valor::jsonb, now())
            ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado = now()
            """, new { Clave = clave, Valor = valor });
    }
}
