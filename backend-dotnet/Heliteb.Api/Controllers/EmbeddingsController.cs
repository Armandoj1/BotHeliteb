using System.Diagnostics;
using System.Text.Json;
using Dapper;
using Heliteb.Application.Abstractions;
using Heliteb.Infrastructure.Data;
using Heliteb.Infrastructure.Embeddings;
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
    private readonly OllamaEmbeddingClient _ollamaClient;
    private readonly GeminiEmbeddingClient _geminiClient;
    private readonly ILlmClient _llmClient;
    private readonly IEmbeddingUsoRepository _uso;
    private readonly IEmbeddingProviderSwitch _embeddingProviderSwitch;
    private readonly IAppConfigStore _appConfig;
    private readonly ILogger<EmbeddingsController> _logger;

    public EmbeddingsController(
        INpgsqlConnectionFactory connectionFactory, OllamaEmbeddingClient ollamaClient, GeminiEmbeddingClient geminiClient,
        ILlmClient llmClient, IEmbeddingUsoRepository uso, IEmbeddingProviderSwitch embeddingProviderSwitch,
        IAppConfigStore appConfig, ILogger<EmbeddingsController> logger)
    {
        _connectionFactory = connectionFactory;
        _ollamaClient = ollamaClient;
        _geminiClient = geminiClient;
        _llmClient = llmClient;
        _uso = uso;
        _embeddingProviderSwitch = embeddingProviderSwitch;
        _appConfig = appConfig;
        _logger = logger;
    }

    public record BackfillResult(string Proveedor, int Procesados, int Errores);

    /// <summary>
    /// Reindexa un proveedor. Si no se pasa ?proveedor=, usa el que esté ACTIVO ahora
    /// mismo (ver IEmbeddingProviderSwitch) - la columna del otro proveedor queda
    /// intacta siempre, para poder comparar ambas sin perder el trabajo ya hecho con
    /// la que no se está reindexando.
    /// </summary>
    [HttpPost("backfill")]
    public async Task<IActionResult> Backfill([FromQuery] string? proveedor, CancellationToken ct)
    {
        var objetivo = proveedor ?? _embeddingProviderSwitch.Current;
        if (!EmbeddingsOptions.ProveedoresValidos.Contains(objetivo, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = $"Proveedor inválido. Válidos: {string.Join(", ", EmbeddingsOptions.ProveedoresValidos)}" });
        }

        var resultado = await BackfillProveedorAsync(objetivo.ToLowerInvariant(), ct);
        return Ok(resultado);
    }

    /// <summary>
    /// Reindexa OLLAMA Y GEMINI en la misma llamada (sin tener que cambiar el switch
    /// de un lado a otro) - pensado para dejar ambas columnas listas antes de usar
    /// "Comparar IA", que necesita datos de los dos para tener sentido.
    /// </summary>
    [HttpPost("backfill-ambos")]
    public async Task<IActionResult> BackfillAmbos(CancellationToken ct)
    {
        var ollama = await BackfillProveedorAsync("ollama", ct);
        var gemini = await BackfillProveedorAsync("gemini", ct);
        return Ok(new { ollama, gemini });
    }

    private async Task<BackfillResult> BackfillProveedorAsync(string proveedor, CancellationToken ct)
    {
        var columna = EmbeddingsOptions.ColumnaPara(proveedor);
        IEmbeddingClient cliente = proveedor.Equals("gemini", StringComparison.OrdinalIgnoreCase) ? _geminiClient : _ollamaClient;

        using var conn = _connectionFactory.Create();
        var pendientes = (await conn.QueryAsync<(string CodigoSap, string Marca, string Categoria, string? Linea,
                string Modelo, string? Descripcion, string? Parametro1, string? Parametro2, string? Parametro3)>($"""
            SELECT p.codigo_sap, m.nombre, c.nombre, p.linea, p.modelo, p.descripcion,
                   p.parametro_1, p.parametro_2, p.parametro_3
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id_marca
            JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.{columna} IS NULL AND p.activo = TRUE
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

                var embedding = await cliente.EmbedAsync(texto, ct);
                var vectorLiteral = PgVectorFormat.ToLiteral(embedding);

                await conn.ExecuteAsync(
                    $"UPDATE productos SET {columna} = @Vector::vector WHERE codigo_sap = @CodigoSap",
                    new { Vector = vectorLiteral, CodigoSap = p.CodigoSap });

                procesados++;
            }
            catch (Exception ex)
            {
                errores++;
                _logger.LogError(ex, "Fallo generando embedding {Proveedor} para {CodigoSap}", proveedor, p.CodigoSap);
            }
        }

        return new BackfillResult(proveedor, procesados, errores);
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

    /// <summary>Fuerza la regeneración del embedding (columna del proveedor activo) de una marca.</summary>
    [HttpPost("reset")]
    public async Task<IActionResult> Reset([FromQuery] string marca)
    {
        var columna = EmbeddingsOptions.ColumnaPara(_embeddingProviderSwitch.Current);
        using var conn = _connectionFactory.Create();
        var afectados = await conn.ExecuteAsync(
            $"UPDATE productos SET {columna} = NULL WHERE id_marca = (SELECT id_marca FROM marcas WHERE nombre = @Marca)",
            new { Marca = marca });
        return Ok(new { afectados });
    }

    /// <summary>
    /// Cuántos productos tienen embedding ya generado, POR CADA proveedor (no solo el
    /// activo) - para poder advertir en el panel si cambiar de proveedor dejaría la
    /// búsqueda semántica sin nada indexado hasta reindexar.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        using var conn = _connectionFactory.Create();
        var total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM productos WHERE activo = TRUE");
        var conOllama = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM productos WHERE activo = TRUE AND embedding IS NOT NULL");
        var conGemini = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM productos WHERE activo = TRUE AND embedding_gemini IS NOT NULL");
        return Ok(new
        {
            total,
            proveedorActivo = _embeddingProviderSwitch.Current,
            ollama = new { conEmbedding = conOllama, pendientes = total - conOllama },
            gemini = new { conEmbedding = conGemini, pendientes = total - conGemini },
        });
    }

    /// <summary>
    /// Resumen de llamadas/costo estimado por proveedor de embeddings (ver
    /// embedding_uso) - para comparar cuánto se ha llamado cada uno y estimar el gasto
    /// real de Gemini antes de decidir cuál dejar en producción.
    /// </summary>
    [HttpGet("uso")]
    public async Task<IActionResult> Uso([FromQuery] int dias = 30, CancellationToken ct = default)
    {
        var desde = DateTime.UtcNow.AddDays(-Math.Max(1, dias));
        var resumen = await _uso.ResumenPorProveedorAsync(desde, ct);
        return Ok(new { dias, proveedorActivo = _embeddingProviderSwitch.Current, resumen });
    }

    /// <summary>
    /// Cambia cuál proveedor de embeddings está activo AHORA MISMO (sin reiniciar la
    /// API) - afecta de inmediato la búsqueda semántica en vivo del bot de WhatsApp,
    /// así que conviene reindexar (POST /backfill) el proveedor nuevo ANTES de
    /// cambiarlo si va a quedar así por un rato, o la búsqueda semántica no
    /// devolverá nada hasta que termine de reindexar.
    /// </summary>
    [HttpPost("proveedor")]
    public IActionResult CambiarProveedor([FromQuery] string proveedor)
    {
        if (!EmbeddingsOptions.ProveedoresValidos.Contains(proveedor, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = $"Proveedor inválido. Válidos: {string.Join(", ", EmbeddingsOptions.ProveedoresValidos)}" });
        }

        _embeddingProviderSwitch.SwitchTo(proveedor.ToLowerInvariant());
        return Ok(new { proveedorActivo = _embeddingProviderSwitch.Current });
    }

    public record PruebaConexionResultado(string Proveedor, bool Ok, long ElapsedMs, string? Error);

    /// <summary>
    /// Prueba de conexión rápida: genera el embedding de un texto fijo corto y mide
    /// cuánto tarda - no necesita catálogo cargado (a diferencia de /comparar), sirve
    /// para confirmar que el proveedor responde justo después de guardar credenciales
    /// o antes de reindexar todo el catálogo con él.
    /// </summary>
    [HttpPost("probar")]
    public async Task<IActionResult> ProbarConexion([FromQuery] string proveedor, CancellationToken ct)
    {
        if (!EmbeddingsOptions.ProveedoresValidos.Contains(proveedor, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = $"Proveedor inválido. Válidos: {string.Join(", ", EmbeddingsOptions.ProveedoresValidos)}" });
        }

        IEmbeddingClient cliente = proveedor.Equals("gemini", StringComparison.OrdinalIgnoreCase) ? _geminiClient : _ollamaClient;
        var sw = Stopwatch.StartNew();
        try
        {
            await cliente.EmbedAsync("prueba de conexión HELITEB", ct);
            sw.Stop();
            return Ok(new PruebaConexionResultado(proveedor.ToLowerInvariant(), true, sw.ElapsedMilliseconds, null));
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Fallo probando conexión con {Proveedor}", proveedor);
            return Ok(new PruebaConexionResultado(proveedor.ToLowerInvariant(), false, sw.ElapsedMilliseconds, ex.Message));
        }
    }

    public record CompararRequest(string Query);
    public record ComparacionItem(string CodigoSap, string Marca, string Modelo, string? Descripcion, double Distancia);
    public record ComparacionProveedorResultado(string Proveedor, bool Ok, long ElapsedMs, string? Error, IReadOnlyList<ComparacionItem> Resultados);

    /// <summary>
    /// Corre la MISMA consulta contra Ollama y Gemini a la vez (cada uno contra su
    /// propia columna, sin importar cuál esté "activo" en el switch) y mide el tiempo
    /// de cada uno - para comparar velocidad en la misma pantalla; la calidad la juzga
    /// el usuario mirando los resultados. Es un top-5 por distancia de coseno directo,
    /// sin las heurísticas de negocio (diversidad de marca, tipo de cámara, etc.) que sí
    /// usa la búsqueda real del bot en ProductRepository - aquí interesa aislar qué tan
    /// bueno es el embedding en sí, no replicar el ranking completo de producción.
    /// </summary>
    [HttpPost("comparar")]
    public async Task<IActionResult> Comparar([FromBody] CompararRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
        {
            return BadRequest(new { error = "query es requerido" });
        }

        var ollamaTask = CompararProveedorAsync("ollama", _ollamaClient, "embedding", request.Query, ct);
        var geminiTask = CompararProveedorAsync("gemini", _geminiClient, "embedding_gemini", request.Query, ct);
        await Task.WhenAll(ollamaTask, geminiTask);

        return Ok(new { ollama = ollamaTask.Result, gemini = geminiTask.Result });
    }

    private async Task<ComparacionProveedorResultado> CompararProveedorAsync(
        string proveedor, IEmbeddingClient cliente, string columna, string query, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var vector = await cliente.EmbedAsync(query, ct);
            var vectorLiteral = PgVectorFormat.ToLiteral(vector);

            using var conn = _connectionFactory.Create();
            var rows = (await conn.QueryAsync<ComparacionItem>($"""
                SELECT p.codigo_sap AS "CodigoSap", m.nombre AS "Marca", p.modelo AS "Modelo",
                       p.descripcion AS "Descripcion", p.{columna} <=> @Vector::vector AS "Distancia"
                FROM productos p
                JOIN marcas m ON p.id_marca = m.id_marca
                WHERE p.activo = TRUE AND p.{columna} IS NOT NULL
                ORDER BY p.{columna} <=> @Vector::vector
                LIMIT 5
                """, new { Vector = vectorLiteral })).AsList();

            sw.Stop();
            return new ComparacionProveedorResultado(proveedor, true, sw.ElapsedMilliseconds, null, rows);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Fallo comparando el proveedor {Proveedor}", proveedor);
            return new ComparacionProveedorResultado(proveedor, false, sw.ElapsedMilliseconds, ex.Message, Array.Empty<ComparacionItem>());
        }
    }

    public record GeminiConfigRequest(string ApiKey);

    /// <summary>Nunca re-expone la API key guardada, solo si ya hay una configurada.</summary>
    [HttpGet("gemini-config")]
    public async Task<IActionResult> ObtenerGeminiConfig(CancellationToken ct)
    {
        var json = await _appConfig.GetAsync("gemini", ct);
        return Ok(new { configurado = !string.IsNullOrWhiteSpace(json) });
    }

    [HttpPost("gemini-config")]
    public async Task<IActionResult> GuardarGeminiConfig([FromBody] GeminiConfigRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ApiKey))
        {
            return BadRequest(new { error = "apiKey es requerido" });
        }

        var json = JsonSerializer.Serialize(new { api_key = request.ApiKey });
        await _appConfig.SetAsync("gemini", json, ct);
        return Ok(new { ok = true });
    }
}
