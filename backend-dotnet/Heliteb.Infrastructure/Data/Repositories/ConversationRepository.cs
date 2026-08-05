using Dapper;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Conversaciones.Dtos;
using Heliteb.Domain.Entities;
using Heliteb.Infrastructure.Data;

namespace Heliteb.Infrastructure.Data.Repositories;

public class ConversationRepository : IConversationStore
{
    private static readonly TimeSpan InactivityTimeout = TimeSpan.FromMinutes(5);

    private readonly INpgsqlConnectionFactory _connectionFactory;

    public ConversationRepository(INpgsqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<int> ResolveSessionGenerationAsync(
        string telefono, bool forceRotate, string? contactName = null, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var session = await conn.QueryFirstOrDefaultAsync<ConversationSession>("""
            SELECT telefono AS "Telefono", generacion AS "Generacion", ultimo_mensaje_en AS "UltimoMensajeEn"
            FROM conversacion_sesion WHERE telefono = @Telefono
            """, new { Telefono = telefono });

        var now = DateTime.UtcNow;
        var rotate = forceRotate || session is null ||
                     now - session.UltimoMensajeEn > InactivityTimeout;

        var nuevaGeneracion = session is null ? 1 : rotate ? session.Generacion + 1 : session.Generacion;

        // COALESCE del lado del contacto: si este mensaje no trae ContactName (ej. un
        // mensaje de salida o el bot de prueba del panel), no se debe borrar el nombre
        // que ya se tenía guardado de un mensaje anterior que sí lo traía.
        await conn.ExecuteAsync("""
            INSERT INTO conversacion_sesion (telefono, generacion, ultimo_mensaje_en, nombre_contacto)
            VALUES (@Telefono, @Generacion, now(), @ContactName)
            ON CONFLICT (telefono) DO UPDATE SET
                generacion = EXCLUDED.generacion,
                ultimo_mensaje_en = now(),
                nombre_contacto = COALESCE(EXCLUDED.nombre_contacto, conversacion_sesion.nombre_contacto)
            """, new { Telefono = telefono, Generacion = nuevaGeneracion, ContactName = contactName });

        return nuevaGeneracion;
    }

    public async Task<IReadOnlyList<ConversationMessage>> GetRecentAsync(
        string telefono, int generacion, int maxTurns, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var rows = await conn.QueryAsync<ConversationMessage>("""
            SELECT id AS "Id", telefono AS "Telefono", generacion AS "Generacion",
                   role AS "Role", content AS "Content", created_at AS "CreatedAt"
            FROM conversacion_mensaje
            WHERE telefono = @Telefono AND generacion = @Generacion
            ORDER BY id DESC
            LIMIT @MaxTurns
            """, new { Telefono = telefono, Generacion = generacion, MaxTurns = maxTurns });

        var list = rows.AsList();
        list.Reverse();
        return list;
    }

    public async Task AppendAsync(string telefono, int generacion, string role, string content, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        await conn.ExecuteAsync("""
            INSERT INTO conversacion_mensaje (telefono, generacion, role, content)
            VALUES (@Telefono, @Generacion, @Role, @Content)
            """, new { Telefono = telefono, Generacion = generacion, Role = role, Content = content });
    }

    public async Task<PagedResult<ConversationSummaryDto>> ListConversacionesAsync(
        string? search, int page, int pageSize, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var offset = (page - 1) * pageSize;
        var searchPattern = string.IsNullOrWhiteSpace(search) ? null : $"%{search}%";

        var items = (await conn.QueryAsync<ConversationSummaryDto>("""
            SELECT s.telefono AS "Telefono", s.nombre_contacto AS "NombreContacto", s.ultimo_mensaje_en AS "UltimoMensajeEn",
                   lm.content AS "UltimoMensajePreview", lm.role AS "UltimoMensajeRole",
                   (SELECT COUNT(*) FROM conversacion_mensaje cm WHERE cm.telefono = s.telefono) AS "TotalMensajes"
            FROM conversacion_sesion s
            LEFT JOIN LATERAL (
                SELECT content, role FROM conversacion_mensaje
                WHERE telefono = s.telefono AND role IN ('user','assistant')
                ORDER BY id DESC LIMIT 1
            ) lm ON true
            WHERE @SearchPattern::text IS NULL OR s.telefono ILIKE @SearchPattern OR s.nombre_contacto ILIKE @SearchPattern
            ORDER BY s.ultimo_mensaje_en DESC
            LIMIT @PageSize OFFSET @Offset
            """, new { SearchPattern = searchPattern, PageSize = pageSize, Offset = offset })).AsList();

        var total = await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*) FROM conversacion_sesion s
            WHERE @SearchPattern::text IS NULL OR s.telefono ILIKE @SearchPattern OR s.nombre_contacto ILIKE @SearchPattern
            """, new { SearchPattern = searchPattern });

        return new PagedResult<ConversationSummaryDto> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }

    public async Task<PagedResult<ConversationMessage>> GetHistorialCompletoAsync(
        string telefono, int page, int pageSize, CancellationToken ct = default)
    {
        using var conn = _connectionFactory.Create();
        var offset = (page - 1) * pageSize;

        // Pagina 1 = mensajes mas recientes; dentro de cada pagina se devuelve en
        // orden cronologico ascendente para poder renderizar el hilo directo.
        //
        // Solo 'user' y 'assistant': las filas 'tool' son el detalle interno de las
        // llamadas del agente (`buscar_productos: {"Success":true,...}`) y en el
        // visor del panel se veian como mensajes sueltos con JSON crudo. Mismo
        // criterio que ya usa el preview del listado y /api/chat/history.
        var items = (await conn.QueryAsync<ConversationMessage>("""
            SELECT * FROM (
                SELECT id AS "Id", telefono AS "Telefono", generacion AS "Generacion",
                       role AS "Role", content AS "Content", created_at AS "CreatedAt"
                FROM conversacion_mensaje
                WHERE telefono = @Telefono AND role IN ('user', 'assistant')
                ORDER BY id DESC
                LIMIT @PageSize OFFSET @Offset
            ) sub ORDER BY "Id" ASC
            """, new { Telefono = telefono, PageSize = pageSize, Offset = offset })).AsList();

        var total = await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*) FROM conversacion_mensaje
            WHERE telefono = @Telefono AND role IN ('user', 'assistant')
            """, new { Telefono = telefono });

        return new PagedResult<ConversationMessage> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }
}
