using System.Diagnostics;
using System.Globalization;
using System.Text.RegularExpressions;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;
using Microsoft.Extensions.Logging;

namespace Heliteb.Agent;

/// <summary>
/// Reemplaza al nodo "🧠 Agente WhatsApp" (langchain Agent) + memoryBufferWindow de n8n.
/// Cada turno es una sola llamada in-process: sin sub-workflows, sin rebotar por el
/// motor de n8n.
/// </summary>
public class AgentOrchestrator : IAgentOrchestrator
{
    // Consultas tipo "arma un sistema completo" (cámaras + grabador + almacenamiento)
    // necesitan varias llamadas a herramientas encadenadas; 8 se quedaba corto y el
    // agente terminaba en el mensaje de "no pude completar" sin haber fallado de verdad.
    private const int MaxIterations = 14;
    private const int ContextWindowTurns = 6;

    /// <summary>Reintentos cuando el modelo devuelve una respuesta vacía por corte
    /// de longitud. Más de dos es quemar tiempo del asesor para acabar igual.</summary>
    private const int MaxIntentosRespuestaVacia = 2;

    /// <summary>
    /// Los campos nulos no se serializan: `"UdsCentral":null,"SkuInventario":null`
    /// son ~60 caracteres por producto que el modelo tiene que leer para nada, y a
    /// 10 productos por búsqueda se notan en un contexto que ya va apretado.
    /// </summary>
    private static readonly System.Text.Json.JsonSerializerOptions JsonHerramientas = new()
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    // WhatsApp acepta mensajes de hasta ~65k caracteres; este límite es solo para
    // evitar respuestas eternas, no una restricción técnica real. Una respuesta que
    // arma un sistema completo (cámaras + grabador + alternativas) puede necesitar
    // más que unos pocos miles de caracteres.
    private const int MaxReplyLength = 6000;

    private readonly ILlmClient _llm;
    private readonly IConversationStore _conversations;
    private readonly ToolRegistry _tools;
    private readonly IAgentNotasRepository _notas;
    private readonly ILlmProviderSwitch _llmProviderSwitch;
    private readonly ILogger<AgentOrchestrator> _logger;

    public AgentOrchestrator(ILlmClient llm, IConversationStore conversations, ToolRegistry tools, IAgentNotasRepository notas, ILlmProviderSwitch llmProviderSwitch, ILogger<AgentOrchestrator> logger)
    {
        _logger = logger;
        _llm = llm;
        _conversations = conversations;
        _tools = tools;
        _notas = notas;
        _llmProviderSwitch = llmProviderSwitch;
    }

    // Comando de PRUEBA MANUAL (no negocio) para alternar el proveedor del LLM sin
    // reiniciar la API — se detecta antes que nada, sin tocar el historial ni pasar
    // por el modelo, para que el propio LLM (que podría estar caído/lento) nunca
    // sea parte del camino de recuperación de este switch.
    private static readonly System.Text.RegularExpressions.Regex CambiaProveedorPattern =
        new(@"^(?:cambia(?:te)?|usa|cambiar)\s+a\s+(groq|deepseek)$",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

    // Guardrail anti-alucinacion: un precio inventado (marca/producto que no existe,
    // con numero y "stock disponible" falsos) es el tipo de error mas dañino para la
    // confianza del cliente, y ninguna regla de prompt lo elimina al 100% - esto lo
    // detecta mecanicamente comparando cualquier precio que la respuesta final
    // mencione contra los precios reales que SI salieron de una herramienta en este
    // turno (buscar_productos/verificar_stock/ventas_cruzadas).
    private static readonly Regex PrecioEnTextoPattern = new(@"\$\s?(\d{1,3}(?:\.\d{3})+)(?!\d)", RegexOptions.Compiled);
    private static readonly Regex PrecioEnHerramientaPattern = new(@"""PrecioMsrpCop""\s*:\s*(\d+(?:\.\d+)?)", RegexOptions.Compiled);

    public async Task<string> HandleMessageAsync(string telefono, string mensaje, string? contactName, CancellationToken ct = default)
    {
        var comandoProveedor = CambiaProveedorPattern.Match(mensaje.Trim());
        if (comandoProveedor.Success)
        {
            var proveedor = comandoProveedor.Groups[1].Value.ToLowerInvariant();
            _llmProviderSwitch.SwitchTo(proveedor);
            return $"Listo, cambié el modelo a *{proveedor}*. Esto es un interruptor de prueba manual (se resetea si la API se reinicia).";
        }

        var esLimpiar = mensaje.Trim().Equals("/limpiar", StringComparison.OrdinalIgnoreCase);
        var generacion = await _conversations.ResolveSessionGenerationAsync(telefono, forceRotate: esLimpiar, contactName, ct);

        if (esLimpiar)
        {
            return "Listo, empecemos de nuevo. ¿En qué te puedo ayudar?";
        }

        await _conversations.AppendAsync(telefono, generacion, "user", mensaje, ct);

        // Se piden más filas de las necesarias porque las filas "tool" (bitácora)
        // cuentan contra el límite pero se descartan antes de re-enviarse al LLM.
        // Historial y notas no dependen entre sí, así que se piden en paralelo.
        var historialTask = _conversations.GetRecentAsync(telefono, generacion, ContextWindowTurns * 4, ct);
        var notasTask = _notas.GetActivasAsync(ct);
        await Task.WhenAll(historialTask, notasTask);
        var historial = historialTask.Result;
        var notasActivas = notasTask.Result;

        var messages = new List<LlmMessage>
        {
            new() { Role = LlmRole.System, Content = SystemPrompt.Build(telefono, notasActivas.Select(n => n.Contenido).ToList()) },
        };
        // Solo user/assistant se re-envían como historial: los mensajes "tool" se
        // guardan únicamente como bitácora (su tool_call_id no sobrevive entre
        // llamadas al LLM, así que reenviarlos rompería el formato de la API).
        foreach (var h in historial.Where(h => h.Role is "user" or "assistant"))
        {
            messages.Add(new LlmMessage { Role = ParseRole(h.Role), Content = h.Content });
        }

        var toolDefinitions = _tools.BuildDefinitions();
        var preciosVistosEsteTurno = new HashSet<long>();
        var yaPidioCorreccionDePrecio = false;
        var intentosRespuestaVacia = 0;

        // Instrumentacion del turno. Sin esto, "el bot tarda 30 segundos" no se
        // puede atacar: hay que saber si se van en las llamadas al modelo, en las
        // herramientas (BD + embeddings) o en cuantas vueltas da el bucle.
        var cronoTurno = Stopwatch.StartNew();
        var msEnLlm = 0L;
        var msEnHerramientas = 0L;
        var llamadasAlLlm = 0;

        for (var iteracion = 0; iteracion < MaxIterations; iteracion++)
        {
            var cronoLlm = Stopwatch.StartNew();
            var completion = await _llm.CompleteAsync(messages, toolDefinitions, ct);
            msEnLlm += cronoLlm.ElapsedMilliseconds;
            llamadasAlLlm++;

            if (completion.ToolCalls.Count == 0)
            {
                var normalizado = WhatsAppFormatNormalizer.Normalize((completion.Content ?? string.Empty).Trim());

                // Un turno sin tool_calls Y sin texto no es una respuesta: es el
                // modelo quedandose mudo. La causa medida (ver el log de
                // finish_reason en DeepSeekClient) es que la generacion se corta por
                // max_tokens antes de emitir nada util - pasa con preguntas que
                // piden varios productos a la vez, como un documento de requisitos.
                // Devolverlo tal cual dejaba una burbuja vacia en el chat.
                //
                // Se le insiste pidiendo BREVEDAD, que ataca la causa real. Con tope
                // de 2 intentos: sin tope se gastaban las 14 iteraciones enteras
                // (~230s de espera) para terminar igual en el fallback.
                if (string.IsNullOrWhiteSpace(normalizado))
                {
                    if (++intentosRespuestaVacia > MaxIntentosRespuestaVacia)
                    {
                        break;
                    }

                    messages.Add(new LlmMessage
                    {
                        Role = LlmRole.User,
                        Content = "[Verificacion automatica] Tu respuesta anterior llego vacia porque se corto por longitud. Responde AHORA, en menos de 15 lineas, usando solo los datos que ya obtuviste de las herramientas. No llames mas herramientas. Si el cliente pidio varios productos, resume cada uno en una linea (modelo, precio y disponibilidad) en vez de detallarlos.",
                    });
                    continue;
                }

                var preciosSinRespaldo = EncontrarPreciosSinRespaldo(normalizado, preciosVistosEsteTurno);
                if (preciosSinRespaldo.Count > 0 && !yaPidioCorreccionDePrecio)
                {
                    yaPidioCorreccionDePrecio = true;
                    messages.Add(new LlmMessage { Role = LlmRole.Assistant, Content = normalizado });
                    messages.Add(new LlmMessage
                    {
                        Role = LlmRole.User,
                        Content = $"[Verificacion automatica] Tu respuesta anterior menciona el/los precio(s) {string.Join(", ", preciosSinRespaldo)} que no aparecen en ningun resultado de buscar_productos/verificar_stock/ventas_cruzadas de este turno. Corrige tu respuesta: usa SOLO precios que hayan salido literalmente de esas herramientas en esta conversacion. Si no tienes un precio real para ese producto, dilo explicitamente en vez de inventar uno.",
                    });
                    continue;
                }

                // Si tras el reintento (o desde el principio, si nunca hubo reintento)
                // sigue habiendo un precio sin respaldo, no se puede confiar en que el
                // LLM se autocorrija una segunda vez (ya se vio en pruebas reales que
                // puede inventar un precio DISTINTO en la correccion) - se reemplaza
                // quirurgicamente en vez de arriesgarse a mandarle un precio falso al
                // cliente.
                var seguro = preciosSinRespaldo.Count > 0
                    ? ReemplazarPreciosSinRespaldo(normalizado, preciosSinRespaldo)
                    : normalizado;

                var final = TruncateAtBoundary(seguro, MaxReplyLength);
                await _conversations.AppendAsync(telefono, generacion, "assistant", final, ct);

                _logger.LogInformation(
                    "Turno resuelto en {TotalMs}ms: {Llamadas} llamadas al modelo ({LlmMs}ms), herramientas {ToolMs}ms, respuesta {Caracteres} caracteres.",
                    cronoTurno.ElapsedMilliseconds, llamadasAlLlm, msEnLlm, msEnHerramientas, final.Length);

                return final;
            }

            // El "pensamiento en voz alta" que a veces acompaña a un tool_call (ej.
            // "Parece que no hay NVR, déjame buscar...") no se reenvía como Content:
            // si queda en el historial, el modelo lo ve como algo ya dicho y termina
            // repitiéndolo o reformulándolo en la respuesta final, como si contestara
            // dos preguntas distintas pegadas.
            messages.Add(new LlmMessage { Role = LlmRole.Assistant, Content = null, ToolCalls = completion.ToolCalls });

            // Cuando el LLM pide varias herramientas en la misma respuesta (ej. buscar
            // camara + buscar NVR), no dependen entre si - se ejecutan en paralelo, pero
            // los resultados se anexan al historial en el ORDEN ORIGINAL en que el LLM
            // las pidio, no en el orden en que terminan, para que el historial quede
            // igual de determinista que antes.
            var cronoHerramientas = Stopwatch.StartNew();
            var toolResultTasks = completion.ToolCalls
                .Select(toolCall => ExecuteToolCallAsync(toolCall, telefono, ct))
                .ToArray();
            await Task.WhenAll(toolResultTasks);
            msEnHerramientas += cronoHerramientas.ElapsedMilliseconds;

            for (var i = 0; i < completion.ToolCalls.Count; i++)
            {
                var toolCall = completion.ToolCalls[i];
                var resultJson = toolResultTasks[i].Result;

                messages.Add(new LlmMessage { Role = LlmRole.Tool, ToolCallId = toolCall.Id, Name = toolCall.Name, Content = resultJson });
                await _conversations.AppendAsync(telefono, generacion, "tool", $"{toolCall.Name}: {resultJson}", ct);

                foreach (Match m in PrecioEnHerramientaPattern.Matches(resultJson))
                {
                    // InvariantCulture a proposito: el JSON siempre trae el punto como
                    // separador decimal, y en una cultura con coma decimal "209129.52"
                    // se leeria como 20912952.
                    if (decimal.TryParse(m.Groups[1].Value, NumberStyles.Number,
                                         CultureInfo.InvariantCulture, out var precio))
                    {
                        // Se guardan el piso Y el redondeo. 32 precios del catalogo
                        // (los de EZVIZ, que salen de una division) traen centavos >=
                        // 0.50: al escribirlos, el texto muestra la parte entera
                        // ($209.129) pero Math.Round daba 209130, asi que el precio
                        // REAL quedaba marcado como inventado. El resultado que veia
                        // el cliente era "(precio pendiente de confirmar),52 COP".
                        preciosVistosEsteTurno.Add((long)Math.Floor(precio));
                        preciosVistosEsteTurno.Add((long)Math.Round(precio));
                    }
                }
            }
        }

        const string fallback = "No pude completar tu solicitud en este momento, ¿puedes reformularla?";
        await _conversations.AppendAsync(telefono, generacion, "assistant", fallback, ct);
        return fallback;
    }

    private static List<string> EncontrarPreciosSinRespaldo(string respuesta, HashSet<long> preciosReales)
    {
        var sinRespaldo = new List<string>();
        foreach (Match m in PrecioEnTextoPattern.Matches(respuesta))
        {
            if (!long.TryParse(m.Groups[1].Value.Replace(".", ""), out var valor)) continue;
            if (!preciosReales.Contains(valor))
            {
                sinRespaldo.Add(m.Value);
            }
        }
        return sinRespaldo;
    }

    private static string ReemplazarPreciosSinRespaldo(string respuesta, List<string> preciosSinRespaldo)
    {
        var resultado = respuesta;
        foreach (var precio in preciosSinRespaldo)
        {
            resultado = resultado.Replace(precio, "(precio pendiente de confirmar)");
        }
        return resultado;
    }

    private static string TruncateAtBoundary(string text, int maxLength)
    {
        if (text.Length <= maxLength) return text;

        var cut = text[..maxLength];
        var lastBreak = cut.LastIndexOfAny(['\n', '.', '!', '?']);
        // Si el último corte natural queda muy al inicio, es mejor un texto un poco
        // más largo que uno truncado a la mitad de la primera frase.
        if (lastBreak > maxLength / 2)
        {
            cut = cut[..(lastBreak + 1)];
        }
        return cut.TrimEnd();
    }

    private async Task<string> ExecuteToolCallAsync(LlmToolCall toolCall, string telefono, CancellationToken ct)
    {
        var tool = _tools.Find(toolCall.Name);
        return tool is null
            ? $$"""{"success":false,"error":"Herramienta desconocida: {{toolCall.Name}}"}"""
            : await ExecuteToolAsync(tool, toolCall, telefono, ct);
    }

    private static async Task<string> ExecuteToolAsync(IAgentTool tool, LlmToolCall toolCall, string telefono, CancellationToken ct)
    {
        try
        {
            var result = await tool.ExecuteAsync(toolCall.ArgumentsJson, telefono, ct);
            return System.Text.Json.JsonSerializer.Serialize(result, JsonHerramientas);
        }
        catch (System.Text.Json.JsonException)
        {
            // Los argumentos que manda el LLM son JSON generado token a token: si la
            // respuesta se corta por max_tokens, llegan a medias ({"query":"camara
            // exter) y cada herramienta reventaba al parsearlos, tumbando el turno
            // entero con un 500. Se le devuelve el error AL MODELO para que reintente
            // la llamada bien formada, que es justo para lo que sirve el bucle.
            return """{"success":false,"error":"Los argumentos de la herramienta llegaron incompletos o mal formados. Vuelve a llamarla con un JSON valido y mas corto."}""";
        }
    }

    private static LlmRole ParseRole(string role) => role switch
    {
        "user" => LlmRole.User,
        "assistant" => LlmRole.Assistant,
        "tool" => LlmRole.Tool,
        _ => LlmRole.User,
    };
}
