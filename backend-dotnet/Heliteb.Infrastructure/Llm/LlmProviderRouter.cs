using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Llm;

/// <summary>
/// ILlmClient real inyectado en el agente: delega a DeepSeek o Groq según
/// ILlmProviderSwitch. Así el AgentOrchestrator sigue siendo agnóstico al
/// proveedor y el cambio de "cambia a groq"/"cambia a deepseek" no requiere
/// reiniciar la API.
/// </summary>
public class LlmProviderRouter : ILlmClient
{
    private readonly ILlmProviderSwitch _switch;
    private readonly DeepSeekClient _deepSeek;
    private readonly GroqClient _groq;

    public LlmProviderRouter(ILlmProviderSwitch @switch, DeepSeekClient deepSeek, GroqClient groq)
    {
        _switch = @switch;
        _deepSeek = deepSeek;
        _groq = groq;
    }

    public Task<LlmCompletion> CompleteAsync(
        IReadOnlyList<LlmMessage> messages,
        IReadOnlyList<LlmToolDefinition> tools,
        CancellationToken ct = default)
    {
        ILlmClient activo = _switch.Current == "groq" ? _groq : _deepSeek;
        return activo.CompleteAsync(messages, tools, ct);
    }
}
