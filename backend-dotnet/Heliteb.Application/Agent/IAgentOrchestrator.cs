namespace Heliteb.Application.Agent;

/// <summary>
/// Reemplaza al nodo "Agente WhatsApp" (langchain Agent) + memoryBufferWindow de n8n:
/// recibe un mensaje entrante, corre el loop LLM+tools en proceso y devuelve el texto final.
/// </summary>
public interface IAgentOrchestrator
{
    Task<string> HandleMessageAsync(
        string telefono, string mensaje, string? contactName, CancellationToken ct = default,
        string? canal = null, string? adjuntoUrl = null, string? tipoAdjunto = null);
}
