using System.Text.Json;
using System.Text.RegularExpressions;
using Heliteb.Application.Abstractions;
using Microsoft.Extensions.Caching.Memory;

namespace Heliteb.Infrastructure.Monitoring;

public class InventarioExternoOptions
{
    public string WebhookUrl { get; set; } = null!;
}

/// <summary>
/// Llama al webhook de n8n que corre la consulta SQL contra inventario_heliteb (tabla
/// que solo n8n puede alcanzar hoy) y cachea el resultado unos minutos - son ~1600 filas
/// que no cambian segundo a segundo, no tiene sentido pegarle al webhook en cada turno
/// del agente.
/// </summary>
public partial class N8nInventarioExternoClient : IInventarioExternoClient
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);
    private const string CacheKey = "inventario_externo";

    private readonly HttpClient _http;
    private readonly InventarioExternoOptions _options;
    private readonly IMemoryCache _cache;

    public N8nInventarioExternoClient(HttpClient http, InventarioExternoOptions options, IMemoryCache cache)
    {
        _http = http;
        _options = options;
        _cache = cache;
    }

    public async Task<IReadOnlyList<InventarioExternoItem>> ListarAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out IReadOnlyList<InventarioExternoItem>? cached) && cached is not null)
        {
            return cached;
        }

        using var response = await _http.GetAsync(_options.WebhookUrl, ct);
        response.EnsureSuccessStatusCode();

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var items = new List<InventarioExternoItem>();

        foreach (var row in doc.RootElement.EnumerateArray())
        {
            var productoRaw = row.GetProperty("producto").GetString() ?? "";
            var stockRaw = row.TryGetProperty("stock_actual", out var stockEl) ? stockEl.GetString() : null;

            items.Add(new InventarioExternoItem
            {
                Id = row.GetProperty("id").GetInt32(),
                ProductoRaw = productoRaw,
                ModeloParsed = ExtraerModelo(productoRaw),
                Almacen = row.TryGetProperty("almacen", out var almacenEl) ? almacenEl.GetString() ?? "" : "",
                StockActual = int.TryParse(stockRaw, out var stock) ? stock : 0,
                Tendencia = row.TryGetProperty("tendencia", out var tendenciaEl) ? tendenciaEl.GetString() : null,
            });
        }

        _cache.Set(CacheKey, (IReadOnlyList<InventarioExternoItem>)items, CacheTtl);
        return items;
    }

    // "[MODELO] resto de la descripcion" -> "MODELO". Si no hay corchetes (~0.3% de las
    // filas, datos sueltos sin ese formato), se usa el texto completo tal cual.
    [GeneratedRegex(@"^\s*\[([^\]]+)\]")]
    private static partial Regex CorcheteRegex();

    private static string ExtraerModelo(string productoRaw)
    {
        var match = CorcheteRegex().Match(productoRaw);
        return match.Success ? match.Groups[1].Value.Trim() : productoRaw.Trim();
    }
}
