using Dapper;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Data.Repositories;

public class RecursosMuestraRepository : IRecursosMuestraRepository
{
    private readonly INpgsqlConnectionFactory _connectionFactory;

    public RecursosMuestraRepository(INpgsqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task InsertarAsync(RecursosMuestraDto muestra, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("""
            INSERT INTO recursos_muestra (ram_total_mb, ram_usado_mb, disco_total_gb, disco_usado_gb, cpu_load_1m)
            VALUES (@RamTotalMb, @RamUsadoMb, @DiscoTotalGb, @DiscoUsadoGb, @CpuLoad1m)
            """, muestra);
    }

    public async Task<IReadOnlyList<RecursosMuestraDto>> ListarRecientesAsync(int horas, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<RecursosMuestraDto>("""
            SELECT medido_en AS "MedidoEn", ram_total_mb AS "RamTotalMb", ram_usado_mb AS "RamUsadoMb",
                   disco_total_gb AS "DiscoTotalGb", disco_usado_gb AS "DiscoUsadoGb", cpu_load_1m AS "CpuLoad1m"
            FROM recursos_muestra
            WHERE medido_en > now() - (@Horas || ' hours')::interval
            ORDER BY medido_en
            """, new { Horas = horas });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<RecursosPorHoraDto>> ResumenPorHoraAsync(DateTime desde, DateTime hasta, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<RecursosPorHoraDto>("""
            SELECT EXTRACT(HOUR FROM medido_en)::int AS "Hora",
                   AVG(ram_usado_mb)::int AS "RamUsadoPromedioMb",
                   MAX(ram_usado_mb) AS "RamUsadoMaxMb",
                   AVG(cpu_load_1m) AS "CpuLoadPromedio",
                   MAX(cpu_load_1m) AS "CpuLoadMax"
            FROM recursos_muestra
            WHERE medido_en >= @Desde AND medido_en < @Hasta
            GROUP BY 1
            ORDER BY 1
            """, new { Desde = desde, Hasta = hasta });
        return rows.AsList();
    }

    public async Task LimpiarAntiguasAsync(TimeSpan retencion, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync(
            "DELETE FROM recursos_muestra WHERE medido_en < now() - @Retencion",
            new { Retencion = retencion });
    }
}
