using Dapper;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Data.Repositories;

public class EmbeddingUsoRepository : IEmbeddingUsoRepository
{
    private readonly INpgsqlConnectionFactory _connectionFactory;

    public EmbeddingUsoRepository(INpgsqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task RegistrarAsync(EmbeddingUsoDto uso, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("""
            INSERT INTO embedding_uso (proveedor, caracteres, tokens_estimados, costo_estimado_usd)
            VALUES (@Proveedor, @Caracteres, @TokensEstimados, @CostoEstimadoUsd)
            """, uso);
    }

    public async Task<IReadOnlyList<EmbeddingUsoResumenDto>> ResumenPorProveedorAsync(DateTime desde, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<EmbeddingUsoResumenDto>("""
            SELECT proveedor AS "Proveedor",
                   COUNT(*)::int AS "Llamadas",
                   SUM(caracteres) AS "Caracteres",
                   SUM(tokens_estimados) AS "TokensEstimados",
                   SUM(costo_estimado_usd) AS "CostoEstimadoUsd"
            FROM embedding_uso
            WHERE creado_en >= @Desde
            GROUP BY proveedor
            ORDER BY proveedor
            """, new { Desde = desde });
        return rows.AsList();
    }
}
