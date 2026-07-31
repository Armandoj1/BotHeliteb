using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Heliteb.Application.Abstractions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Heliteb.Infrastructure.Embeddings;

public class GeminiOptions
{
    // Valor con el que arranca la API si nunca se guardó nada desde el panel (ver
    // ResolveApiKeyAsync) - una vez que alguien la guarda ahí, esta queda ignorada.
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com";
    public string EmbeddingModel { get; set; } = "gemini-embedding-001";
    // gemini-embedding-001 usa Matryoshka Representation Learning: puede truncarse a
    // cualquier dimensión menor a su default (3072) sin perder mucha calidad. Se fija
    // en 1024 para que coincida exactamente con vector(1024) de embedding_gemini, sin
    // necesitar otra migración de esquema.
    public int OutputDimensionality { get; set; } = 1024;
    // Precio publicado por Google al momento de integrar esto (jul 2026, $0.15 por
    // millón de tokens de entrada, tier estándar) - no hay forma de leerlo dinámicamente
    // desde la API, así que si Google lo cambia hay que actualizar esto a mano.
    public decimal PrecioPorMillonTokensUsd { get; set; } = 0.15m;
}

/// <summary>Forma del JSON guardado en app_config.clave='gemini'.</summary>
internal class GeminiConfigJson
{
    [JsonPropertyName("api_key")] public string? ApiKey { get; set; }
}

/// <summary>
/// Alternativa de pago a OllamaEmbeddingClient, para comparar calidad y practicidad
/// de búsqueda antes de decidir cuál dejar en producción (ver Embeddings:Provider en
/// appsettings.json). Escribe/lee la columna embedding_gemini, no la columna embedding
/// de Ollama/bge-m3 - ambas conviven en la misma tabla productos (ver ProductRepository
/// y EmbeddingsController).
/// </summary>
public class GeminiEmbeddingClient : IEmbeddingClient
{
    private const string ConfigKey = "gemini";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);

    private readonly HttpClient _http;
    private readonly GeminiOptions _options;
    private readonly IMemoryCache _cache;
    private readonly IEmbeddingUsoRepository _uso;
    private readonly IAppConfigStore _configStore;
    private readonly ILogger<GeminiEmbeddingClient> _logger;

    public GeminiEmbeddingClient(
        HttpClient http, GeminiOptions options, IMemoryCache cache, IEmbeddingUsoRepository uso,
        IAppConfigStore configStore, ILogger<GeminiEmbeddingClient> logger)
    {
        _http = http;
        _options = options;
        _cache = cache;
        _uso = uso;
        _configStore = configStore;
        _logger = logger;
        _http.BaseAddress = new Uri(_options.BaseUrl);
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var cacheKey = $"embedding:gemini:{_options.EmbeddingModel}:{_options.OutputDimensionality}:{text.Trim().ToLowerInvariant()}";
        if (_cache.TryGetValue(cacheKey, out float[]? cached) && cached is not null)
        {
            return cached;
        }

        var apiKey = await ResolveApiKeyAsync(ct);
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Equals("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "La API key de Gemini no está configurada. Guárdala en 'Uso de IA' → Credenciales de Gemini, en el panel.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, $"/v1beta/models/{_options.EmbeddingModel}:embedContent")
        {
            Content = JsonContent.Create(new
            {
                model = $"models/{_options.EmbeddingModel}",
                content = new { parts = new[] { new { text } } },
                outputDimensionality = _options.OutputDimensionality,
            }),
        };
        request.Headers.Add("x-goog-api-key", apiKey);

        using var response = await _http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var embedding = doc.RootElement.GetProperty("embedding").GetProperty("values")
            .EnumerateArray().Select(e => e.GetSingle()).ToArray();

        _cache.Set(cacheKey, embedding, CacheTtl);
        await RegistrarUsoAsync(text, ct);
        return embedding;
    }

    /// <summary>
    /// El panel guarda su propia API key en app_config (ver GeminiConfigController) sin
    /// reiniciar la API - igual que SmtpEmailService.ResolveOptionsAsync para SMTP.
    /// </summary>
    private async Task<string> ResolveApiKeyAsync(CancellationToken ct)
    {
        var overrideJson = await _configStore.GetAsync(ConfigKey, ct);
        if (string.IsNullOrWhiteSpace(overrideJson)) return _options.ApiKey;

        try
        {
            var stored = JsonSerializer.Deserialize<GeminiConfigJson>(overrideJson);
            return !string.IsNullOrWhiteSpace(stored?.ApiKey) ? stored.ApiKey : _options.ApiKey;
        }
        catch (JsonException)
        {
            return _options.ApiKey;
        }
    }

    // La API de embeddings de Gemini no devuelve el conteo real de tokens facturados
    // en la respuesta (a diferencia de generateContent) - caracteres/4 es solo una
    // ESTIMACION de costo para el panel, no el número exacto que factura Google.
    private async Task RegistrarUsoAsync(string text, CancellationToken ct)
    {
        try
        {
            var caracteres = text.Length;
            var tokensEstimados = Math.Max(1, caracteres / 4);
            var costo = tokensEstimados / 1_000_000m * _options.PrecioPorMillonTokensUsd;
            await _uso.RegistrarAsync(new EmbeddingUsoDto
            {
                Proveedor = "gemini",
                Caracteres = caracteres,
                TokensEstimados = tokensEstimados,
                CostoEstimadoUsd = costo,
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo registrar el uso de embeddings de Gemini (no afecta la búsqueda).");
        }
    }
}
