using Heliteb.Api.Servicios;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class ChatRequest
{
    public string SessionId { get; set; } = null!;
    public string Mensaje { get; set; } = null!;
}

/// <summary>
/// Chat del panel Angular (pestaña "Chat", uso interno para probar el agente sin
/// pasar por WhatsApp). A diferencia de /api/debug/chat, corre también en
/// Production — el panel no tiene un modo "Development" separado.
/// </summary>
[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly IAgentOrchestrator _agent;
    private readonly IConversationStore _conversations;
    private readonly ExtractorTextoAdjunto _extractor;

    public ChatController(
        IAgentOrchestrator agent, IConversationStore conversations, ExtractorTextoAdjunto extractor)
    {
        _agent = agent;
        _conversations = conversations;
        _extractor = extractor;
    }

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] ChatRequest request, CancellationToken ct)
    {
        var respuesta = await _agent.HandleMessageAsync(request.SessionId, request.Mensaje, null, ct);
        return Ok(new { respuesta });
    }

    /// <summary>
    /// Mismo chat, pero con un documento adjunto. Se extrae el texto y se le
    /// entrega al agente dentro del mensaje: el modelo es de texto, no lee
    /// archivos por sí solo.
    /// </summary>
    [HttpPost("adjunto")]
    [RequestSizeLimit(ExtractorTextoAdjunto.MaxBytes)]
    public async Task<IActionResult> SendConAdjunto(
        [FromForm] string sessionId,
        [FromForm] string? mensaje,
        IFormFile archivo,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { ok = false, motivo = "sessionId es obligatorio." });
        }

        if (archivo is null || archivo.Length == 0)
        {
            return BadRequest(new { ok = false, motivo = "No llegó ningún archivo." });
        }

        if (archivo.Length > ExtractorTextoAdjunto.MaxBytes)
        {
            return BadRequest(new { ok = false, motivo = "El archivo supera los 10 MB." });
        }

        await using var contenido = archivo.OpenReadStream();
        var extraido = await _extractor.ExtraerAsync(contenido, archivo.FileName, ct);

        if (!extraido.Ok)
        {
            // 422: el archivo llegó bien, pero no se puede leer su contenido.
            return UnprocessableEntity(new { ok = false, motivo = extraido.Motivo });
        }

        // El texto del documento va delimitado y con el nombre del archivo, para
        // que el modelo distinga qué escribió el asesor de qué venía en el adjunto.
        var instruccion = string.IsNullOrWhiteSpace(mensaje)
            ? "El asesor adjuntó este documento. Resúmelo y dile en qué le puede servir."
            : mensaje.Trim();

        var mensajeCompleto =
            $"""
             {instruccion}

             --- Documento adjunto: {archivo.FileName} ---
             {extraido.Texto}
             --- fin del documento ---
             """;

        var respuesta = await _agent.HandleMessageAsync(sessionId, mensajeCompleto, null, ct);

        return Ok(new
        {
            ok = true,
            respuesta,
            archivo = archivo.FileName,
            caracteres = extraido.Texto.Length,
            paginas = extraido.Paginas,
        });
    }

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] string sessionId, CancellationToken ct)
    {
        // forceRotate:false solo para leer la generación vigente — no se manda /limpiar aquí.
        var generacion = await _conversations.ResolveSessionGenerationAsync(sessionId, forceRotate: false, ct: ct);
        var historial = await _conversations.GetRecentAsync(sessionId, generacion, maxTurns: 100, ct);

        var mensajes = historial
            .Where(h => h.Role is "user" or "assistant")
            .Select(h => new { role = h.Role, content = h.Content, createdAt = h.CreatedAt });

        return Ok(mensajes);
    }
}
