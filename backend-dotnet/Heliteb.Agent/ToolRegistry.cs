using Heliteb.Application.Abstractions;
using Heliteb.Application.Agent;

namespace Heliteb.Agent;

public class ToolRegistry
{
    private readonly IReadOnlyDictionary<string, IAgentTool> _tools;

    public ToolRegistry(IEnumerable<IAgentTool> tools)
    {
        _tools = tools.ToDictionary(t => t.Name);
    }

    public IReadOnlyList<LlmToolDefinition> BuildDefinitions() =>
        _tools.Values.Select(t => new LlmToolDefinition
        {
            Name = t.Name,
            Description = t.Description,
            ParametersJsonSchema = t.ParametersJsonSchema,
        }).ToList();

    public IAgentTool? Find(string name) => _tools.GetValueOrDefault(name);
}
