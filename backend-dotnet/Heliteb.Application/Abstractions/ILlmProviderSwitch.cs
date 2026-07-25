namespace Heliteb.Application.Abstractions;

/// <summary>
/// Estado en memoria (no persistido, se resetea al reiniciar la API) de qué
/// proveedor de LLM está activo. Se activa vía comando de chat ("cambia a groq")
/// para pruebas manuales — no es una feature de negocio, es un interruptor de
/// desarrollo, por eso no vive en la BD como app_config.
/// </summary>
public interface ILlmProviderSwitch
{
    string Current { get; }
    void SwitchTo(string provider);
}
