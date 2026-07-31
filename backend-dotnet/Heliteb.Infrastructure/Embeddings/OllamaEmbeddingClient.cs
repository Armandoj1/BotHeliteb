using System.Net.Http.Json;
using System.Text.Json;
using Heliteb.Application.Abstractions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Heliteb.Infrastructure.Embeddings;

public class OllamaOptions
{
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string EmbeddingModel { get; set; } = "bge-m3";
}

public class OllamaEmbeddingClient : IEmbeddingClient
{
    // El embedding de un mismo texto+modelo es determinístico — cachear evita pegarle
    // a Ollama de nuevo cuando distintos usuarios (o el mismo) preguntan algo parecido.
    // TTL acotado solo para no dejar crecer la caché sin límite, no porque el valor
    // pueda "vencerse".
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);

    private readonly HttpClient _http;
    private readonly OllamaOptions _options;
    private readonly IMemoryCache _cache;
    private readonly IEmbeddingUsoRepository _uso;
    private readonly ILogger<OllamaEmbeddingClient> _logger;

    public OllamaEmbeddingClient(HttpClient http, OllamaOptions options, IMemoryCache cache, IEmbeddingUsoRepository uso, ILogger<OllamaEmbeddingClient> logger)
    {
        _http = http;
        _options = options;
        _cache = cache;
        _uso = uso;
        _logger = logger;
        _http.BaseAddress = new Uri(_options.BaseUrl);
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var cacheKey = $"embedding:{_options.EmbeddingModel}:{text.Trim().ToLowerInvariant()}";
        if (_cache.TryGetValue(cacheKey, out float[]? cached) && cached is not null)
        {
            return cached;
        }

        // keep_alive evita que Ollama descargue el modelo de memoria a los 5 minutos
        // (default), que es lo que causaba que la primera consulta semantica tras un
        // rato de silencio tardara mas de 30s y cancelara el turno completo del agente.
        using var response = await _http.PostAsJsonAsync("/api/embeddings",
            new { model = _options.EmbeddingModel, prompt = text, keep_alive = "30m" }, ct);
        response.EnsureSuccessStatusCode();

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var embedding = doc.RootElement.GetProperty("embedding").EnumerateArray().Select(e => e.GetSingle()).ToArray();

        _cache.Set(cacheKey, embedding, CacheTtl);
        await RegistrarUsoAsync(text, ct);
        return embedding;
    }

    // Se registra en la misma tabla que Gemini (costo siempre 0, es self-hosted) para
    // poder comparar volumen de llamadas de ambos proveedores lado a lado en el panel.
    private async Task RegistrarUsoAsync(string text, CancellationToken ct)
    {
        try
        {
            await _uso.RegistrarAsync(new EmbeddingUsoDto
            {
                Proveedor = "ollama",
                Caracteres = text.Length,
                TokensEstimados = Math.Max(1, text.Length / 4),
                CostoEstimadoUsd = 0,
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo registrar el uso de embeddings de Ollama (no afecta la búsqueda).");
        }
    }
}
