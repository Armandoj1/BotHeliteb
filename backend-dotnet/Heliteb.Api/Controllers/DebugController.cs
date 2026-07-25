using Heliteb.Application.Agent;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class DebugChatRequest
{
    public string Telefono { get; set; } = null!;
    public string Mensaje { get; set; } = null!;
}

/// <summary>
/// Solo para desarrollo: corre el loop del agente (LLM + tools) sin despachar la
/// respuesta por WhatsApp, para poder probar el tool-calling sin tocar InboxCRM.
/// </summary>
[ApiController]
[Route("api/debug")]
public class DebugController : ControllerBase
{
    private readonly IAgentOrchestrator _agent;
    private readonly IWebHostEnvironment _env;

    public DebugController(IAgentOrchestrator agent, IWebHostEnvironment env)
    {
        _agent = agent;
        _env = env;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] DebugChatRequest request, CancellationToken ct)
    {
        if (!_env.IsDevelopment()) return NotFound();

        var respuesta = await _agent.HandleMessageAsync(request.Telefono, request.Mensaje, null, ct);
        return Ok(new { respuesta });
    }
}
