using Heliteb.Agent;
using Heliteb.Agent.Tools;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;
using Heliteb.Infrastructure.Data;
using Heliteb.Infrastructure.Data.Repositories;
using Heliteb.Infrastructure.Embeddings;
using Heliteb.Infrastructure.Llm;

namespace Heliteb.Api.Agent;

/// <summary>
/// Construye un IAgentOrchestrator aislado para "Comparador" con DOS ejes
/// independientes, pineados, sin tocar ninguno de los switches globales que
/// atienden tráfico real de WhatsApp:
///
///  - Eje LLM (quién razona y decide qué herramienta llamar): DeepSeek o Groq.
///  - Eje embeddings (quién resuelve buscar_productos / ventas_cruzadas): Ollama
///    o Gemini.
///
/// Los dos ejes se eligen por separado a propósito: el caso de uso real es "un
/// proveedor barato hace el embedding, uno más capaz orquesta las herramientas" -
/// si esto forzara el mismo proveedor para ambos roles, esa comparación sería
/// imposible de correr desde el panel.
/// </summary>
public class ComparacionAgentFactory
{
    private readonly INpgsqlConnectionFactory _connectionFactory;
    private readonly IConversationStore _conversations;
    private readonly IAgentNotasRepository _notas;
    private readonly IPromptPersonaRepository _personaPrompt;
    private readonly IEnumerable<IAgentTool> _herramientasAmbiente;
    private readonly DeepSeekClient _deepSeek;
    private readonly GroqClient _groq;
    private readonly IMediaInterpreter _mediaInterpreter;
    private readonly ILogger<AgentOrchestrator> _loggerOrquestador;

    public ComparacionAgentFactory(
        INpgsqlConnectionFactory connectionFactory, IConversationStore conversations,
        IAgentNotasRepository notas, IPromptPersonaRepository personaPrompt, IEnumerable<IAgentTool> herramientasAmbiente,
        DeepSeekClient deepSeek, GroqClient groq, IMediaInterpreter mediaInterpreter, ILogger<AgentOrchestrator> loggerOrquestador)
    {
        _connectionFactory = connectionFactory;
        _conversations = conversations;
        _notas = notas;
        _personaPrompt = personaPrompt;
        _herramientasAmbiente = herramientasAmbiente;
        _deepSeek = deepSeek;
        _groq = groq;
        _mediaInterpreter = mediaInterpreter;
        _loggerOrquestador = loggerOrquestador;
    }

    public IAgentOrchestrator CrearPara(string llmProveedor, string embeddingProveedor, IEmbeddingClient embeddingClientFijo)
    {
        var switchEmbeddingFijo = new FixedEmbeddingProviderSwitch(embeddingProveedor);
        var productosAislado = new ProductRepository(_connectionFactory, embeddingClientFijo, switchEmbeddingFijo);

        // Todas las herramientas que NO dependen de embeddings se reutilizan de la
        // inyección de dependencias normal; solo estas dos se reconstruyen contra el
        // ProductRepository aislado de arriba.
        var herramientas = _herramientasAmbiente
            .Where(t => t.Name != "buscar_productos" && t.Name != "ventas_cruzadas")
            .Append<IAgentTool>(new BuscarProductosTool(productosAislado))
            .Append<IAgentTool>(new VentasCruzadasTool(productosAislado));

        var registry = new ToolRegistry(herramientas);
        ILlmClient llmFijo = llmProveedor.Equals("groq", StringComparison.OrdinalIgnoreCase) ? _groq : _deepSeek;
        var switchLlmFijo = new FixedLlmProviderSwitch(llmProveedor);

        return new AgentOrchestrator(llmFijo, _conversations, registry, _notas, _personaPrompt, switchLlmFijo, _mediaInterpreter, _loggerOrquestador);
    }
}
