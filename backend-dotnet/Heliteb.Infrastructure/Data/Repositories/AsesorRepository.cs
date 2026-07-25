using Dapper;
using Heliteb.Application.Asesores;
using Heliteb.Application.Asesores.Dtos;
using Heliteb.Domain.Entities;
using Heliteb.Infrastructure.Data;

namespace Heliteb.Infrastructure.Data.Repositories;

public class AsesorRepository : IAsesorRepository
{
    private readonly INpgsqlConnectionFactory _connectionFactory;

    public AsesorRepository(INpgsqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<AsesorListItemDto>> ListAsync(CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<AsesorListItemDto>("""
            SELECT a.id AS "Id", a.nombre AS "Nombre", a.email AS "Email", a.telefono AS "Telefono",
                   a.activo AS "Activo", a.created_at AS "CreatedAt",
                   (aa.verificado_hasta IS NOT NULL AND aa.verificado_hasta > now()) AS "Verificado"
            FROM asesores a
            LEFT JOIN asesor_auth aa ON aa.asesor_id = a.id
            ORDER BY a.nombre
            """);
        return rows.AsList();
    }

    public async Task<Asesor?> GetByTelefonoAsync(string telefono, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        return await conn.QueryFirstOrDefaultAsync<Asesor>("""
            SELECT id AS "Id", nombre AS "Nombre", email AS "Email", telefono AS "Telefono",
                   activo AS "Activo", created_at AS "CreatedAt"
            FROM asesores WHERE telefono = @Telefono
            """, new { Telefono = telefono });
    }

    public async Task<Asesor> CreateAsync(Asesor asesor, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var id = await conn.ExecuteScalarAsync<int>("""
            INSERT INTO asesores (nombre, email, telefono, activo)
            VALUES (@Nombre, @Email, @Telefono, @Activo)
            RETURNING id
            """, asesor);
        asesor.Id = id;
        return asesor;
    }

    public async Task UpdateNombreEmailAsync(string telefono, string nombre, string email, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync(
            "UPDATE asesores SET nombre = @Nombre, email = @Email WHERE telefono = @Telefono",
            new { Telefono = telefono, Nombre = nombre, Email = email });
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("DELETE FROM asesores WHERE id = @Id", new { Id = id });
    }

    public async Task<AsesorAuth?> GetAuthAsync(string telefono, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        return await conn.QueryFirstOrDefaultAsync<AsesorAuth>("""
            SELECT telefono AS "Telefono", asesor_id AS "AsesorId", codigo AS "Codigo",
                   codigo_expira AS "CodigoExpira", intentos AS "Intentos", verificado_hasta AS "VerificadoHasta"
            FROM asesor_auth WHERE telefono = @Telefono
            """, new { Telefono = telefono });
    }

    public async Task UpsertAuthAsync(AsesorAuth auth, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("""
            INSERT INTO asesor_auth (telefono, asesor_id, codigo, codigo_expira, intentos, verificado_hasta)
            VALUES (@Telefono, @AsesorId, @Codigo, @CodigoExpira, @Intentos, @VerificadoHasta)
            ON CONFLICT (telefono) DO UPDATE SET
                asesor_id = EXCLUDED.asesor_id,
                codigo = EXCLUDED.codigo,
                codigo_expira = EXCLUDED.codigo_expira,
                intentos = EXCLUDED.intentos,
                verificado_hasta = EXCLUDED.verificado_hasta
            """, auth);
    }

    public async Task<bool> EstaVerificadoAsync(string telefono, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var count = await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*) FROM asesores a
            JOIN asesor_auth aa ON aa.asesor_id = a.id
            WHERE a.telefono = @Telefono AND a.activo = TRUE
              AND aa.verificado_hasta IS NOT NULL AND aa.verificado_hasta > now()
            """, new { Telefono = telefono });
        return count > 0;
    }
}
