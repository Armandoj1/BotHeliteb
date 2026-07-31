using System.Diagnostics;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;
using Heliteb.Infrastructure.Llm;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

/// <summary>
/// Categoría "Modelo normal" del comparador: una respuesta de texto directa, sin
/// herramientas, sin memoria de conversación y sin búsqueda semántica — el LLM puro,
/// tal como respondería fuera del agente. Es la contraparte de
/// ComparacionChatController (que sí corre el agente completo con herramientas) y de
/// EmbeddingsController.Comparar (que mide solo la búsqueda semántica), no un
/// reemplazo de ninguno de los dos.
/// </summary>
[ApiController]
[Route("api/llm")]
public class LlmComparisonController : ControllerBase
{
    private readonly DeepSeekClient _deepSeek;
    private readonly GroqClient _groq;
    private readonly ILogger<LlmComparisonController> _logger;

    public LlmComparisonController(DeepSeekClient deepSeek, GroqClient groq, ILogger<LlmComparisonController> logger)
    {
        _deepSeek = deepSeek;
        _groq = groq;
        _logger = logger;
    }

    public record CompararLlmSlotRequest(string Llm);
    public record CompararLlmRequest(CompararLlmSlotRequest SlotA, CompararLlmSlotRequest SlotB, string Mensaje, string? SystemPrompt);
    public record CompararLlmSlotResultado(string Llm, bool Ok, long ElapsedMs, string? Respuesta, string? Error);

    [HttpPost("comparar")]
    public async Task<IActionResult> Comparar([FromBody] CompararLlmRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Mensaje))
        {
            return BadRequest(new { error = "mensaje es requerido" });
        }

        var errorA = ValidarLlm(request.SlotA?.Llm, "slot_a");
        var errorB = errorA ?? ValidarLlm(request.SlotB?.Llm, "slot_b");
        if (errorB is not null)
        {
            return BadRequest(new { error = errorB });
        }

        var slotATask = EjecutarAsync(request.SlotA!.Llm, request.Mensaje, request.SystemPrompt, ct);
        var slotBTask = EjecutarAsync(request.SlotB!.Llm, request.Mensaje, request.SystemPrompt, ct);
        await Task.WhenAll(slotATask, slotBTask);

        return Ok(new { slot_a = slotATask.Result, slot_b = slotBTask.Result });
    }

    private string? ValidarLlm(string? llm, string nombre) =>
        LlmProveedores.ProveedoresValidos.Contains(llm, StringComparer.OrdinalIgnoreCase)
            ? null
            : $"{nombre}.llm inválido. Válidos: {string.Join(", ", LlmProveedores.ProveedoresValidos)}";

    private async Task<CompararLlmSlotResultado> EjecutarAsync(
        string llm, string mensaje, string? systemPrompt, CancellationToken ct)
    {
        ILlmClient cliente = llm.Equals("groq", StringComparison.OrdinalIgnoreCase) ? _groq : _deepSeek;

        var mensajes = new List<LlmMessage>();
        if (!string.IsNullOrWhiteSpace(systemPrompt))
        {
            mensajes.Add(new LlmMessage { Role = LlmRole.System, Content = systemPrompt });
        }
        mensajes.Add(new LlmMessage { Role = LlmRole.User, Content = mensaje });

        var sw = Stopwatch.StartNew();
        try
        {
            // Sin herramientas: esta categoría mide el modelo en bruto, no al agente.
            var completion = await cliente.CompleteAsync(mensajes, Array.Empty<LlmToolDefinition>(), ct);
            sw.Stop();
            return new CompararLlmSlotResultado(llm, true, sw.ElapsedMilliseconds, completion.Content, null);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Fallo comparando modelo normal con {Llm}", llm);
            return new CompararLlmSlotResultado(llm, false, sw.ElapsedMilliseconds, null, ex.Message);
        }
    }
}
