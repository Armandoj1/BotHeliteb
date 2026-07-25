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

    public ChatController(IAgentOrchestrator agent, IConversationStore conversations)
    {
        _agent = agent;
        _conversations = conversations;
    }

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] ChatRequest request, CancellationToken ct)
    {
        var respuesta = await _agent.HandleMessageAsync(request.SessionId, request.Mensaje, null, ct);
        return Ok(new { respuesta });
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
