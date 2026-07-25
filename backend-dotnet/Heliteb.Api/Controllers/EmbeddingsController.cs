using Dapper;
using Heliteb.Application.Abstractions;
using Heliteb.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

/// <summary>
/// Genera/actualiza los embeddings semánticos de productos. Se corre una vez
/// para el catálogo existente y luego cada vez que el sync de Excel (n8n) agrega
/// productos nuevos (quedan con embedding NULL hasta la próxima corrida).
///
/// El catálogo es ~97% HIKVISION/HiLook/HIKMICRO descrito en inglés; solo EZVIZ
/// describe en español. Un embedding multilingüe da "ventaja de idioma" al texto
/// que coincide literalmente con el idioma de la consulta — así que sin esto,
/// una pregunta en español termina mostrando solo EZVIZ aunque HIKVISION tenga
/// 40 veces más productos y opciones igual o más relevantes. Por eso el texto de
/// EZVIZ se traduce a inglés antes de generar su embedding: todo el catálogo
/// compite en el mismo idioma, y el resultado depende del contenido, no del
/// idioma en que quedó redactada la ficha original.
/// </summary>
[ApiController]
[Route("api/embeddings")]
public class EmbeddingsController : ControllerBase
{
    private readonly INpgsqlConnectionFactory _connectionFactory;
    private readonly IEmbeddingClient _embeddingClient;
    private readonly ILlmClient _llmClient;
    private readonly ILogger<EmbeddingsController> _logger;

    public EmbeddingsController(
        INpgsqlConnectionFactory connectionFactory, IEmbeddingClient embeddingClient, ILlmClient llmClient,
        ILogger<EmbeddingsController> logger)
    {
        _connectionFactory = connectionFactory;
        _embeddingClient = embeddingClient;
        _llmClient = llmClient;
        _logger = logger;
    }

    public record BackfillResult(int Procesados, int Errores);

    [HttpPost("backfill")]
    public async Task<IActionResult> Backfill(CancellationToken ct)
    {
        using var conn = _connectionFactory.Create();
        var pendientes = (await conn.QueryAsync<(string CodigoSap, string Marca, string Categoria, string? Linea,
                string Modelo, string? Descripcion, string? Parametro1, string? Parametro2, string? Parametro3)>("""
            SELECT p.codigo_sap, m.nombre, c.nombre, p.linea, p.modelo, p.descripcion,
                   p.parametro_1, p.parametro_2, p.parametro_3
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id_marca
            JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.embedding IS NULL AND p.activo = TRUE
            """)).AsList();

        var procesados = 0;
        var errores = 0;

        foreach (var p in pendientes)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var texto = $"{p.Marca} {p.Categoria} {p.Linea} {p.Modelo} {p.Descripcion} {p.Parametro1} {p.Parametro2} {p.Parametro3}";

                if (string.Equals(p.Marca, "EZVIZ", StringComparison.OrdinalIgnoreCase))
                {
                    texto = await TranslateToEnglishAsync(texto, ct);
                }

                var embedding = await _embeddingClient.EmbedAsync(texto, ct);
                var vectorLiteral = PgVectorFormat.ToLiteral(embedding);

                await conn.ExecuteAsync(
                    "UPDATE productos SET embedding = @Vector::vector WHERE codigo_sap = @CodigoSap",
                    new { Vector = vectorLiteral, CodigoSap = p.CodigoSap });

                procesados++;
            }
            catch (Exception ex)
            {
                errores++;
                _logger.LogError(ex, "Fallo generando embedding para {CodigoSap}", p.CodigoSap);
            }
        }

        return Ok(new BackfillResult(procesados, errores));
    }

    private async Task<string> TranslateToEnglishAsync(string texto, CancellationToken ct)
    {
        var messages = new List<LlmMessage>
        {
            new()
            {
                Role = LlmRole.System,
                Content = "Traduce el siguiente texto de ficha de producto a inglés. Responde ÚNICAMENTE con la traducción, sin comentarios ni comillas.",
            },
            new() { Role = LlmRole.User, Content = texto },
        };

        var completion = await _llmClient.CompleteAsync(messages, Array.Empty<LlmToolDefinition>(), ct);
        return string.IsNullOrWhiteSpace(completion.Content) ? texto : completion.Content.Trim();
    }

    /// <summary>Fuerza la regeneración del embedding de una marca (ej. tras ajustar la traducción).</summary>
    [HttpPost("reset")]
    public async Task<IActionResult> Reset([FromQuery] string marca)
    {
        using var conn = _connectionFactory.Create();
        var afectados = await conn.ExecuteAsync(
            "UPDATE productos SET embedding = NULL WHERE id_marca = (SELECT id_marca FROM marcas WHERE nombre = @Marca)",
            new { Marca = marca });
        return Ok(new { afectados });
    }

    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        using var conn = _connectionFactory.Create();
        var total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM productos WHERE activo = TRUE");
        var conEmbedding = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM productos WHERE activo = TRUE AND embedding IS NOT NULL");
        return Ok(new { total, conEmbedding, pendientes = total - conEmbedding });
    }
}
