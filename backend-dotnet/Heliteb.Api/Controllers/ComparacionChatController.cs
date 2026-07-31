using System.Diagnostics;
using Heliteb.Api.Agent;
using Heliteb.Application.Agent;
using Heliteb.Infrastructure.Embeddings;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

/// <summary>
/// Corre una conversación COMPLETA (LLM + todas las herramientas del agente, no solo
/// la búsqueda semántica cruda) en dos slots independientes, cada uno con su propio
/// par (LLM, proveedor de embeddings) — así el panel puede enfrentar, por ejemplo,
/// "Groq orquestando + Ollama buscando" contra "DeepSeek orquestando + Gemini
/// buscando", o cualquier otra combinación, sin tocar los switches que deciden quién
/// responde a clientes reales por WhatsApp (ver ComparacionAgentFactory).
/// </summary>
[ApiController]
[Route("api/embeddings")]
public class ComparacionChatController : ControllerBase
{
    private readonly ComparacionAgentFactory _factory;
    private readonly OllamaEmbeddingClient _ollamaClient;
    private readonly GeminiEmbeddingClient _geminiClient;
    private readonly ILogger<ComparacionChatController> _logger;

    public ComparacionChatController(
        ComparacionAgentFactory factory, OllamaEmbeddingClient ollamaClient, GeminiEmbeddingClient geminiClient,
        ILogger<ComparacionChatController> logger)
    {
        _factory = factory;
        _ollamaClient = ollamaClient;
        _geminiClient = geminiClient;
        _logger = logger;
    }

    public record ComparacionAgenteSlotRequest(string SessionId, string Llm, string Embedding);
    public record CompararChatRequest(ComparacionAgenteSlotRequest SlotA, ComparacionAgenteSlotRequest SlotB, string Mensaje);
    public record CompararChatSlotResultado(
        string Llm, string Embedding, bool Ok, long ElapsedMs, string? Respuesta, string? Error);

    [HttpPost("comparar-chat")]
    public async Task<IActionResult> CompararChat([FromBody] CompararChatRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Mensaje))
        {
            return BadRequest(new { error = "mensaje es requerido" });
        }

        var error = ValidarSlot(request.SlotA, "slot_a") ?? ValidarSlot(request.SlotB, "slot_b");
        if (error is not null)
        {
            return BadRequest(new { error });
        }

        var slotATask = EjecutarAsync(request.SlotA, request.Mensaje, ct);
        var slotBTask = EjecutarAsync(request.SlotB, request.Mensaje, ct);
        await Task.WhenAll(slotATask, slotBTask);

        return Ok(new { slot_a = slotATask.Result, slot_b = slotBTask.Result });
    }

    private string? ValidarSlot(ComparacionAgenteSlotRequest slot, string nombre)
    {
        if (string.IsNullOrWhiteSpace(slot?.SessionId))
        {
            return $"{nombre}.session_id es requerido";
        }
        if (!LlmProveedores.ProveedoresValidos.Contains(slot.Llm, StringComparer.OrdinalIgnoreCase))
        {
            return $"{nombre}.llm inválido. Válidos: {string.Join(", ", LlmProveedores.ProveedoresValidos)}";
        }
        if (!EmbeddingsOptions.ProveedoresValidos.Contains(slot.Embedding, StringComparer.OrdinalIgnoreCase))
        {
            return $"{nombre}.embedding inválido. Válidos: {string.Join(", ", EmbeddingsOptions.ProveedoresValidos)}";
        }
        return null;
    }

    private async Task<CompararChatSlotResultado> EjecutarAsync(
        ComparacionAgenteSlotRequest slot, string mensaje, CancellationToken ct)
    {
        var embeddingClient = slot.Embedding.Equals("gemini", StringComparison.OrdinalIgnoreCase)
            ? (Heliteb.Application.Abstractions.IEmbeddingClient)_geminiClient
            : _ollamaClient;

        var sw = Stopwatch.StartNew();
        try
        {
            var agente = _factory.CrearPara(slot.Llm, slot.Embedding, embeddingClient);
            var respuesta = await agente.HandleMessageAsync(slot.SessionId, mensaje, null, ct);
            sw.Stop();
            return new CompararChatSlotResultado(slot.Llm, slot.Embedding, true, sw.ElapsedMilliseconds, respuesta, null);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Fallo comparando chat con LLM={Llm} Embedding={Embedding}", slot.Llm, slot.Embedding);
            return new CompararChatSlotResultado(slot.Llm, slot.Embedding, false, sw.ElapsedMilliseconds, null, ex.Message);
        }
    }
}
