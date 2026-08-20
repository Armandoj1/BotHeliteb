namespace Heliteb.Application.Agent;

/// <summary>
/// Convierte una foto o nota de voz que mando el cliente en texto que el agente
/// (basado en texto) puede usar en el mismo turno - describe la imagen o
/// transcribe el audio, segun el tipo. Devuelve null si no se pudo procesar
/// (adjunto no descargable, tipo no soportado, proveedor de IA caido).
/// </summary>
public interface IMediaInterpreter
{
    Task<string?> InterpretarAsync(string url, string tipoMensaje, CancellationToken ct = default);
}
