using System.Text;
using UglyToad.PdfPig;

namespace Heliteb.Api.Servicios;

public record TextoExtraido(bool Ok, string Texto, string? Motivo, int Paginas);

/// <summary>
/// Saca el texto de un documento adjunto para poder pasárselo al agente.
///
/// A propósito NO acepta imágenes: el modelo que usa el bot (DeepSeek/Groq en
/// modo texto) no las puede leer, y aceptarlas sería fingir que funciona —
/// el asesor adjuntaría una foto y recibiría una respuesta inventada sobre un
/// contenido que el modelo nunca vio.
/// </summary>
public class ExtractorTextoAdjunto
{
    /// <summary>Tope de caracteres que se le inyectan al prompt. Un PDF de 80
    /// páginas no cabe en la ventana de contexto y encarece cada turno.</summary>
    public const int MaxCaracteres = 20_000;

    public const long MaxBytes = 10 * 1024 * 1024;

    private static readonly HashSet<string> ExtensionesTexto = new(StringComparer.OrdinalIgnoreCase)
    {
        ".txt", ".md", ".csv", ".json", ".xml", ".log", ".yml", ".yaml", ".htm", ".html",
    };

    public async Task<TextoExtraido> ExtraerAsync(Stream contenido, string nombreArchivo, CancellationToken ct)
    {
        var extension = Path.GetExtension(nombreArchivo);

        if (string.Equals(extension, ".pdf", StringComparison.OrdinalIgnoreCase))
        {
            return ExtraerDePdf(contenido);
        }

        if (ExtensionesTexto.Contains(extension))
        {
            using var lector = new StreamReader(contenido, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            var texto = await lector.ReadToEndAsync(ct);
            return Normalizar(texto, paginas: 1);
        }

        return new TextoExtraido(false, string.Empty,
            $"No puedo leer archivos {extension}. Acepto PDF y texto (txt, csv, md, json, xml).", 0);
    }

    private static TextoExtraido ExtraerDePdf(Stream contenido)
    {
        // PdfPig necesita un stream con Seek; el de un form-file de ASP.NET lo
        // tiene, pero se copia igual para no depender de eso.
        using var memoria = new MemoryStream();
        contenido.CopyTo(memoria);
        memoria.Position = 0;

        try
        {
            using var documento = PdfDocument.Open(memoria);
            var constructor = new StringBuilder();
            var paginas = 0;

            foreach (var pagina in documento.GetPages())
            {
                paginas++;
                constructor.AppendLine(pagina.Text);
                if (constructor.Length > MaxCaracteres) break;
            }

            var texto = constructor.ToString();
            if (string.IsNullOrWhiteSpace(texto))
            {
                // Pasa con PDFs que son un escaneo: solo traen imágenes, sin capa
                // de texto. Sin OCR no hay nada que leer, y decirlo es mejor que
                // mandarle al modelo una cadena vacía.
                return new TextoExtraido(false, string.Empty,
                    "El PDF no tiene texto seleccionable (parece un escaneo). Necesitaría OCR para leerlo.", paginas);
            }

            return Normalizar(texto, paginas);
        }
        catch (Exception ex)
        {
            return new TextoExtraido(false, string.Empty, $"No pude abrir el PDF: {ex.Message}", 0);
        }
    }

    private static TextoExtraido Normalizar(string texto, int paginas)
    {
        var limpio = texto.Replace("\r\n", "\n").Trim();

        if (string.IsNullOrWhiteSpace(limpio))
        {
            return new TextoExtraido(false, string.Empty, "El archivo está vacío.", paginas);
        }

        var truncado = limpio.Length > MaxCaracteres;
        if (truncado)
        {
            limpio = limpio[..MaxCaracteres] + "\n\n[...documento truncado, se leyó solo el inicio...]";
        }

        return new TextoExtraido(true, limpio, null, paginas);
    }
}
