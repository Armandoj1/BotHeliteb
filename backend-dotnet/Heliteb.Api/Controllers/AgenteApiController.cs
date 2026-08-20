using System.Security.Cryptography;
using System.Text;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class AgenteMensajeRequest
{
    /// <summary>
    /// Identificador de la conversación. El agente guarda el historial contra este
    /// valor, así que el mismo id continúa la charla y uno nuevo la empieza de cero.
    /// </summary>
    public string SessionId { get; set; } = null!;

    public string Mensaje { get; set; } = null!;

    /// <summary>Nombre del cliente, si el sistema que llama lo conoce. Opcional.</summary>
    public string? NombreContacto { get; set; }

    /// <summary>
    /// Quien esta del otro lado: "cliente" (el comprador final, p.ej. desde el CRM)
    /// o "asesor" (alguien del equipo consultando). Con "cliente" el agente vende:
    /// se presenta, indaga, recomienda y cotiza directo. Sin valor se comporta
    /// como antes de existir este campo.
    /// </summary>
    public string? Canal { get; set; }

    /// <summary>
    /// URL de la foto o nota de voz que mando el cliente (adjunto de WhatsApp vía
    /// Kommo). Opcional - cuando viene, el agente la interpreta (describe la foto o
    /// transcribe el audio) antes de responder. Con esto puede venir Mensaje vacío
    /// (el cliente solo mandó la foto, sin texto).
    /// </summary>
    public string? AdjuntoUrl { get; set; }

    /// <summary>
    /// Tipo del adjunto tal como lo manda Kommo (ej. "picture", "voice", "audio",
    /// "file"). Determina si se transcribe como audio o se describe como imagen.
    /// </summary>
    public string? TipoAdjunto { get; set; }
}

/// <summary>
/// Entrada máquina-a-máquina al agente comercial: otro sistema (un CRM, un chat web,
/// otro agente) manda el mensaje del cliente y recibe la respuesta del vendedor.
///
/// Existe aparte de /api/chat porque ese exige un JWT de asesor que solo se obtiene
/// con un OTP enviado al teléfono de una persona — sirve para el panel, no para un
/// servicio. Y aparte de /webhook/heliteb-whatsapp porque ese no devuelve la
/// respuesta: la entrega él mismo por WhatsApp vía InboxCRM.
///
/// Autenticación por clave fija en el header X-Api-Key. Si no hay clave configurada
/// (Agente:ApiKey / AGENT_API_KEY) el endpoint responde 503 y no atiende a nadie:
/// desplegar esto NO abre nada por sí solo, hay que poner la clave a propósito.
/// </summary>
[ApiController]
[AllowAnonymous] // autenticado por X-Api-Key propio, no por el JWT del panel
[Route("api/agente")]
public class AgenteApiController : ControllerBase
{
    private const string ApiKeyHeader = "X-Api-Key";

    private readonly IAgentOrchestrator _agente;
    private readonly IConversationStore _conversaciones;
    private readonly string? _apiKey;
    private readonly ILogger<AgenteApiController> _logger;

    public AgenteApiController(
        IAgentOrchestrator agente,
        IConversationStore conversaciones,
        IConfiguration configuration,
        ILogger<AgenteApiController> logger)
    {
        _agente = agente;
        _conversaciones = conversaciones;
        _apiKey = configuration["Agente:ApiKey"];
        _logger = logger;
    }

    [HttpPost("mensaje")]
    public async Task<IActionResult> Mensaje([FromBody] AgenteMensajeRequest request, CancellationToken ct)
    {
        var rechazo = VerificarClave();
        if (rechazo is not null) return rechazo;

        // Mensaje puede venir vacio SOLO si trae un adjunto (el cliente mando una foto
        // o nota de voz sin texto) - el agente lo interpreta antes de responder.
        if (string.IsNullOrWhiteSpace(request.SessionId)
            || (string.IsNullOrWhiteSpace(request.Mensaje) && string.IsNullOrWhiteSpace(request.AdjuntoUrl)))
        {
            return BadRequest(new { ok = false, motivo = "session_id y (mensaje o adjunto_url) son obligatorios." });
        }

        // El session_id entra tal cual como llave del historial. Se acota el largo
        // para que un cliente no pueda inflar la tabla con llaves enormes.
        if (request.SessionId.Length > 80)
        {
            return BadRequest(new { ok = false, motivo = "session_id no puede superar 80 caracteres." });
        }

        var respuesta = await _agente.HandleMessageAsync(
            request.SessionId, request.Mensaje ?? string.Empty, request.NombreContacto, ct, request.Canal,
            request.AdjuntoUrl, request.TipoAdjunto);

        return Ok(new { ok = true, session_id = request.SessionId, respuesta });
    }

    /// <summary>Historial de una conversación, para que quien integra pueda pintarla.</summary>
    [HttpGet("historial")]
    public async Task<IActionResult> Historial([FromQuery] string sessionId, CancellationToken ct)
    {
        var rechazo = VerificarClave();
        if (rechazo is not null) return rechazo;

        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { ok = false, motivo = "sessionId es obligatorio." });
        }

        var generacion = await _conversaciones.ResolveSessionGenerationAsync(sessionId, forceRotate: false, ct: ct);
        var historial = await _conversaciones.GetRecentAsync(sessionId, generacion, maxTurns: 100, ct);

        return Ok(new
        {
            ok = true,
            session_id = sessionId,
            mensajes = historial
                .Where(h => h.Role is "user" or "assistant")
                .Select(h => new { rol = h.Role, contenido = h.Content, fecha = h.CreatedAt }),
        });
    }

    private IActionResult? VerificarClave()
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("Se llamó a /api/agente sin que Agente:ApiKey esté configurada.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                ok = false,
                motivo = "La API del agente no está habilitada en este entorno.",
            });
        }

        var recibida = Request.Headers[ApiKeyHeader].ToString();

        // Comparación en tiempo constante: un string == corriente sale en el primer
        // byte distinto y filtra la clave a fuerza de medir tiempos de respuesta.
        var esperada = Encoding.UTF8.GetBytes(_apiKey);
        var entrante = Encoding.UTF8.GetBytes(recibida);
        if (entrante.Length != esperada.Length || !CryptographicOperations.FixedTimeEquals(entrante, esperada))
        {
            return Unauthorized(new { ok = false, motivo = "Clave de API inválida o ausente." });
        }

        return null;
    }
}
