using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Llm;

public class LlmProviderSwitch : ILlmProviderSwitch
{
    private volatile string _current = "deepseek";

    public string Current => _current;

    public void SwitchTo(string provider) => _current = provider;
}
