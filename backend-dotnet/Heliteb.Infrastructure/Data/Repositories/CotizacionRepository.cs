using Dapper;
using Heliteb.Domain.Entities;
using Heliteb.Infrastructure.Data;

namespace Heliteb.Infrastructure.Data.Repositories;

public class CotizacionRepository
{
    private readonly INpgsqlConnectionFactory _connectionFactory;

    public CotizacionRepository(INpgsqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<int> InsertAsync(Cotizacion cotizacion, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        return await conn.ExecuteScalarAsync<int>("""
            INSERT INTO cotizaciones
                (folio, cliente, cliente_email, asesor, subtotal, iva, total, productos_count, productos_json, pdf_url, token)
            VALUES
                (@Folio, @Cliente, @ClienteEmail, @Asesor, @Subtotal, @Iva, @Total, @ProductosCount, @ProductosJson::jsonb, @PdfUrl, @Token)
            RETURNING id
            """, cotizacion);
    }

    public async Task<Cotizacion?> GetByTokenAsync(string token, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        return await conn.QueryFirstOrDefaultAsync<Cotizacion>(
            """SELECT folio AS "Folio", pdf_url AS "PdfUrl", token AS "Token" FROM cotizaciones WHERE token = @Token""",
            new { Token = token });
    }

    public async Task<Cotizacion?> GetByFolioAsync(string folio, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        return await conn.QueryFirstOrDefaultAsync<Cotizacion>("""
            SELECT id AS "Id", folio AS "Folio", cliente AS "Cliente", cliente_email AS "ClienteEmail",
                   asesor AS "Asesor", subtotal AS "Subtotal", iva AS "Iva", total AS "Total",
                   productos_count AS "ProductosCount", productos_json::text AS "ProductosJson",
                   pdf_url AS "PdfUrl", created_at AS "CreatedAt"
            FROM cotizaciones WHERE folio = @Folio
            """, new { Folio = folio });
    }

    public async Task<IReadOnlyList<Cotizacion>> ListAsync(CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<Cotizacion>("""
            SELECT id AS "Id", folio AS "Folio", cliente AS "Cliente", cliente_email AS "ClienteEmail",
                   asesor AS "Asesor", subtotal AS "Subtotal", iva AS "Iva", total AS "Total",
                   productos_count AS "ProductosCount", productos_json::text AS "ProductosJson",
                   pdf_url AS "PdfUrl", created_at AS "CreatedAt"
            FROM cotizaciones ORDER BY created_at DESC
            """);
        return rows.AsList();
    }
}
