using Heliteb.Application.Agent;
using Heliteb.Infrastructure.Embeddings;
using Microsoft.Extensions.Logging;

namespace Heliteb.Infrastructure.Llm;

/// <summary>
/// El link de adjunto que manda Kommo (amojo.kommo.com/.../attachments/...) redirige
/// varias veces hasta terminar en una URL firmada de Google Storage - un GET simple
/// con auto-redirect (comportamiento por defecto de HttpClient) basta, no hace falta
/// ningun token de Kommo para descargarlo.
///
/// Audio via Groq (Whisper) e imagen via Gemini (unico proveedor con vision
/// confiable que se probo: Groq y DeepSeek no tienen modelo con vision en esta
/// cuenta, y un modelo self-hosted en Ollama dio respuestas lentas e intermitentes).
/// </summary>
public class GroqMediaInterpreter : IMediaInterpreter
{
    private readonly HttpClient _download;
    private readonly GroqClient _groq;
    private readonly GeminiVisionClient _gemini;
    private readonly ILogger<GroqMediaInterpreter> _logger;

    public GroqMediaInterpreter(HttpClient download, GroqClient groq, GeminiVisionClient gemini, ILogger<GroqMediaInterpreter> logger)
    {
        _download = download;
        _groq = groq;
        _gemini = gemini;
        _logger = logger;
    }

    public async Task<string?> InterpretarAsync(string url, string tipoMensaje, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;

        byte[] bytes;
        try
        {
            using var response = await _download.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();
            bytes = await response.Content.ReadAsByteArrayAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo descargar el adjunto del cliente: {Url}", url);
            return null;
        }

        var esAudio = tipoMensaje is "voice" or "audio";
        if (esAudio)
        {
            try
            {
                var texto = await _groq.TranscribirAudioAsync(bytes, "nota_voz.ogg", ct);
                return string.IsNullOrWhiteSpace(texto)
                    ? null
                    : $"[El cliente mando una nota de voz, transcrita a texto]: {texto}";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo transcribir la nota de voz del cliente: {Url}", url);
                return null;
            }
        }

        // 'picture' (foto) y cualquier otro tipo no soportado (ej. 'file', que
        // WhatsApp tambien usa para stickers e imagenes reenviadas) se tratan como
        // imagen - es lo que Kommo manda con mas frecuencia por WhatsApp aparte de audio.
        try
        {
            var descripcion = await _gemini.DescribirImagenAsync(bytes, "image/jpeg", ct);
            return string.IsNullOrWhiteSpace(descripcion)
                ? null
                : $"[El cliente mando una foto. Lo que se ve en la imagen]: {descripcion}";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo describir la foto del cliente: {Url}", url);
            return null;
        }
    }
}
