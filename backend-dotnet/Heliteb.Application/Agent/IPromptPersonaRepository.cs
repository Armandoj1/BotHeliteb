namespace Heliteb.Application.Agent;

/// <summary>
/// Persona/estilo de venta editable desde el panel sin tocar codigo (ver
/// SystemPrompt.BuildVendedorSection). Una fila por canal en prompt_persona; si
/// no hay fila guardada, el llamador debe caer al texto por defecto.
/// </summary>
public interface IPromptPersonaRepository
{
    /// <summary>Null si nadie lo ha personalizado para este canal todavia.</summary>
    Task<string?> GetAsync(string canal, CancellationToken ct = default);

    Task SetAsync(string canal, string contenido, CancellationToken ct = default);

    /// <summary>Borra el override: el canal vuelve al texto por defecto.</summary>
    Task RestaurarAsync(string canal, CancellationToken ct = default);
}
