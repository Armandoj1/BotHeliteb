using Heliteb.Application.Conversaciones.Dtos;
using Heliteb.Domain.Entities;

namespace Heliteb.Application.Abstractions;

/// <summary>
/// Replaces n8n's memoryBufferWindow + static-data session rotation:
/// a session per phone number that rotates on "/limpiar" or 5 minutes of inactivity,
/// keeping the last N turns as conversation memory for the LLM.
/// </summary>
public interface IConversationStore
{
    Task<int> ResolveSessionGenerationAsync(
        string telefono, bool forceRotate, string? contactName = null, CancellationToken ct = default);

    Task<IReadOnlyList<ConversationMessage>> GetRecentAsync(
        string telefono, int generacion, int maxTurns, CancellationToken ct = default);

    Task AppendAsync(
        string telefono, int generacion, string role, string content, CancellationToken ct = default);

    /// <summary>Inbox del panel: una fila por teléfono, ordenada por actividad reciente, con preview del último mensaje.</summary>
    Task<PagedResult<ConversationSummaryDto>> ListConversacionesAsync(
        string? search, int page, int pageSize, CancellationToken ct = default);

    /// <summary>Historial completo de un teléfono, cruzando todas sus generaciones, paginado (página 1 = más reciente).</summary>
    Task<PagedResult<ConversationMessage>> GetHistorialCompletoAsync(
        string telefono, int page, int pageSize, CancellationToken ct = default);
}
