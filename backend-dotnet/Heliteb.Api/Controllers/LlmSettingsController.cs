using System.Diagnostics;
using System.Text.Json;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;
using Heliteb.Infrastructure.Llm;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

/// <summary>
/// Credenciales y prueba de conexión de los proveedores de LLM (DeepSeek, Groq),
/// guardadas en app_config — mismo patrón que EmbeddingsController usa para Gemini,
/// separado en su propio controller porque estos dos no son proveedores de
/// embeddings, son el eje que orquesta las herramientas del agente.
/// </summary>
[ApiController]
[Route("api/llm")]
public class LlmSettingsController : ControllerBase
{
    private static readonly JsonSerializerOptions SnakeCaseJson =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    private readonly IAppConfigStore _appConfig;
    private readonly DeepSeekClient _deepSeek;
    private readonly GroqClient _groq;
    private readonly ILogger<LlmSettingsController> _logger;

    public LlmSettingsController(
        IAppConfigStore appConfig, DeepSeekClient deepSeek, GroqClient groq, ILogger<LlmSettingsController> logger)
    {
        _appConfig = appConfig;
        _deepSeek = deepSeek;
        _groq = groq;
        _logger = logger;
    }

    public record LlmConfigRequest(string ApiKey);

    [HttpGet("{proveedor}-config")]
    public async Task<IActionResult> ObtenerConfig(string proveedor, CancellationToken ct)
    {
        if (!EsProveedorValido(proveedor, out var badRequest)) return badRequest!;

        // Nunca se re-expone la clave guardada, solo si ya hay algo configurado.
        var json = await _appConfig.GetAsync(proveedor, ct);
        return Ok(new { configurado = !string.IsNullOrWhiteSpace(json) });
    }

    [HttpPost("{proveedor}-config")]
    public async Task<IActionResult> GuardarConfig(string proveedor, [FromBody] LlmConfigRequest request, CancellationToken ct)
    {
        if (!EsProveedorValido(proveedor, out var badRequest)) return badRequest!;

        if (string.IsNullOrWhiteSpace(request.ApiKey))
        {
            return BadRequest(new { error = "api_key es requerido" });
        }

        var json = JsonSerializer.Serialize(new { api_key = request.ApiKey }, SnakeCaseJson);
        await _appConfig.SetAsync(proveedor, json, ct);
        return Ok(new { ok = true });
    }

    public record PruebaConexionResultado(string Proveedor, bool Ok, long ElapsedMs, string? Error);

    /// <summary>
    /// Prueba de conexión: pide una respuesta corta, sin herramientas y sin historial
    /// — igual que /api/embeddings/probar, sirve para confirmar que la credencial
    /// funciona sin depender de que el catálogo tenga productos ni de que exista una
    /// conversación previa.
    /// </summary>
    [HttpPost("probar")]
    public async Task<IActionResult> ProbarConexion([FromQuery] string proveedor, CancellationToken ct)
    {
        if (!EsProveedorValido(proveedor, out var badRequest)) return badRequest!;

        ILlmClient cliente = proveedor.Equals("groq", StringComparison.OrdinalIgnoreCase) ? _groq : _deepSeek;
        var mensajes = new[]
        {
            new LlmMessage { Role = LlmRole.System, Content = "Responde solo con la palabra: ok" },
            new LlmMessage { Role = LlmRole.User, Content = "prueba de conexión HELITEB" },
        };

        var sw = Stopwatch.StartNew();
        try
        {
            await cliente.CompleteAsync(mensajes, Array.Empty<LlmToolDefinition>(), ct);
            sw.Stop();
            return Ok(new PruebaConexionResultado(proveedor.ToLowerInvariant(), true, sw.ElapsedMilliseconds, null));
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Fallo probando conexión LLM con {Proveedor}", proveedor);
            return Ok(new PruebaConexionResultado(proveedor.ToLowerInvariant(), false, sw.ElapsedMilliseconds, ex.Message));
        }
    }

    private bool EsProveedorValido(string proveedor, out IActionResult? badRequest)
    {
        if (LlmProveedores.ProveedoresValidos.Contains(proveedor, StringComparer.OrdinalIgnoreCase))
        {
            badRequest = null;
            return true;
        }

        badRequest = BadRequest(new
        {
            error = $"Proveedor inválido. Válidos: {string.Join(", ", LlmProveedores.ProveedoresValidos)}",
        });
        return false;
    }
}
