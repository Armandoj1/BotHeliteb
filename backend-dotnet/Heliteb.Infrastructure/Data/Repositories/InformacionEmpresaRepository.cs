using System.Globalization;
using System.Text;
using Dapper;
using Heliteb.Application.Agent;
using Heliteb.Application.Agent.Dtos;
using Heliteb.Domain.Entities;

namespace Heliteb.Infrastructure.Data.Repositories;

public class InformacionEmpresaRepository : IInformacionEmpresaRepository
{
    private readonly INpgsqlConnectionFactory _connectionFactory;

    public InformacionEmpresaRepository(INpgsqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<ContactoEmpresa>> BuscarContactosAsync(string? area = null, CancellationToken ct = default)
    {
        const string sql = """
            SELECT id AS "Id", area AS "Area", cargo AS "Cargo", nombre AS "Nombre",
                   correo AS "Correo", telefono AS "Telefono", nota AS "Nota"
            FROM contactos_empresa
            WHERE @Area IS NULL OR area ILIKE '%' || @Area || '%' OR cargo ILIKE '%' || @Area || '%'
            ORDER BY area
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<ContactoEmpresa>(sql, new { Area = area })).AsList();
    }

    public async Task<IReadOnlyList<Sede>> BuscarSedesAsync(string? ciudad = null, CancellationToken ct = default)
    {
        const string sql = """
            SELECT id AS "Id", ciudad AS "Ciudad", direccion AS "Direccion", telefono AS "Telefono"
            FROM sedes
            WHERE @Ciudad IS NULL OR ciudad ILIKE '%' || @Ciudad || '%'
            ORDER BY ciudad
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<Sede>(sql, new { Ciudad = ciudad })).AsList();
    }

    public async Task<IReadOnlyList<AsesorSede>> BuscarAsesoresSedeAsync(string? ciudad = null, CancellationToken ct = default)
    {
        const string sql = """
            SELECT a.id AS "Id", a.sede_id AS "SedeId", a.nombre AS "Nombre", a.cargo AS "Cargo",
                   a.correo AS "Correo", a.telefono AS "Telefono",
                   s.ciudad AS "SedeCiudad", s.direccion AS "SedeDireccion"
            FROM asesores_sede a
            JOIN sedes s ON s.id = a.sede_id
            WHERE @Ciudad IS NULL OR s.ciudad ILIKE '%' || @Ciudad || '%'
            ORDER BY s.ciudad, a.nombre
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<AsesorSede>(sql, new { Ciudad = ciudad })).AsList();
    }

    public async Task<IReadOnlyList<MedioPago>> GetMediosPagoAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT id AS "Id", medio AS "Medio", canal AS "Canal",
                   observacion AS "Observacion", validacion AS "Validacion"
            FROM medios_pago
            ORDER BY id
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<MedioPago>(sql)).AsList();
    }

    public async Task<IReadOnlyList<Garantia>> BuscarGarantiasAsync(string? marca = null, string? tipoProducto = null, CancellationToken ct = default)
    {
        const string sql = """
            SELECT id AS "Id", familia AS "Familia", marca AS "Marca",
                   tipo_producto AS "TipoProducto", meses AS "Meses", observacion AS "Observacion"
            FROM garantias
            WHERE (@Marca IS NULL OR marca ILIKE '%' || @Marca || '%')
              AND (@TipoProducto IS NULL OR tipo_producto ILIKE '%' || @TipoProducto || '%' OR familia ILIKE '%' || @TipoProducto || '%')
            ORDER BY familia, marca, tipo_producto
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<Garantia>(sql, new { Marca = marca, TipoProducto = tipoProducto })).AsList();
    }

    public async Task<IReadOnlyList<GarantiaPolitica>> BuscarPoliticasAsync(string? categoria = null, CancellationToken ct = default)
    {
        const string sql = """
            SELECT id AS "Id", categoria AS "Categoria", contenido AS "Contenido"
            FROM garantia_politicas
            WHERE @Categoria IS NULL OR categoria ILIKE '%' || @Categoria || '%'
            ORDER BY id
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<GarantiaPolitica>(sql, new { Categoria = categoria })).AsList();
    }

    public async Task<SedesSyncResultDto> SincronizarSedesAsync(IReadOnlyList<SedeSyncItem> sedesDelSheet, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var existentes = (await conn.QueryAsync<Sede>(
            """SELECT id AS "Id", ciudad AS "Ciudad", direccion AS "Direccion", telefono AS "Telefono" FROM sedes""")).AsList();

        // Normaliza agresivo (sin tildes, sin puntuacion, espacios colapsados) porque el
        // Sheet y la BD no necesariamente coinciden caracter a caracter en como escriben
        // la misma direccion (comas, "No.3" vs "No. 3", "Bogota" vs "Bogotá", etc.) -
        // sin esto, cada diferencia minima de formato crea una sede duplicada en vez de
        // reconocer que es la misma.
        static string Normalizar(string s)
        {
            var sinTildes = s.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var soloBase = new string(sinTildes.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
            // La puntuacion se reemplaza por espacio (no se borra) - "No.3" y "No. 3" deben
            // normalizar igual ("no 3"), no quedar como "no3" vs "no 3" por perder el separador.
            var conEspacios = new string(soloBase.Select(c => char.IsLetterOrDigit(c) ? c : ' ').ToArray());
            return string.Join(' ', conEspacios.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        static string Clave(string ciudad, string direccion) => $"{Normalizar(ciudad)}|{Normalizar(direccion)}";

        // GroupBy en vez de ToDictionary: hoy existen filas duplicadas (mismo ciudad+direccion,
        // ver id 1 y 11) - no se puede asumir que la clave es unica en los datos existentes.
        var porClave = existentes
            .GroupBy(s => Clave(s.Ciudad, s.Direccion))
            .ToDictionary(g => g.Key, g => g.First());
        var vistas = new HashSet<string>();
        var resultado = new SedesSyncResultDto();

        foreach (var item in sedesDelSheet)
        {
            if (string.IsNullOrWhiteSpace(item.Ciudad) || string.IsNullOrWhiteSpace(item.Direccion)) continue;

            var clave = Clave(item.Ciudad, item.Direccion);
            vistas.Add(clave);

            if (porClave.TryGetValue(clave, out var existente))
            {
                if (!string.Equals(existente.Telefono?.Trim(), item.Telefono?.Trim(), StringComparison.Ordinal))
                {
                    await conn.ExecuteAsync(
                        "UPDATE sedes SET telefono = @Telefono WHERE id = @Id",
                        new { Telefono = item.Telefono, existente.Id });
                    resultado.Actualizadas++;
                }
                else
                {
                    resultado.SinCambios++;
                }
            }
            else
            {
                await conn.ExecuteAsync(
                    "INSERT INTO sedes (ciudad, direccion, telefono) VALUES (@Ciudad, @Direccion, @Telefono)",
                    new { item.Ciudad, item.Direccion, item.Telefono });
                resultado.Insertadas++;
            }
        }

        resultado.NoEncontradasEnSheet = existentes
            .Where(s => !vistas.Contains(Clave(s.Ciudad, s.Direccion)))
            .Select(s => $"{s.Ciudad} - {s.Direccion}")
            .ToList();

        return resultado;
    }
}
