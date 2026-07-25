using DocumentFormat.OpenXml.Packaging;
using DrawingText = DocumentFormat.OpenXml.Drawing.Text;

namespace Heliteb.Infrastructure.Documents;

/// <summary>Extrae el texto plano de un .pptx, una linea por parrafo de texto encontrado.</summary>
public static class PptxTextExtractor
{
    public static string ExtractText(Stream pptxStream)
    {
        using var doc = PresentationDocument.Open(pptxStream, false);
        var presentationPart = doc.PresentationPart ?? throw new InvalidOperationException("El archivo no tiene contenido de presentacion.");

        var lineas = new List<string>();
        foreach (var slidePart in presentationPart.SlideParts)
        {
            foreach (var text in slidePart.Slide?.Descendants<DrawingText>() ?? [])
            {
                var valor = text.Text?.Trim();
                if (!string.IsNullOrEmpty(valor))
                {
                    lineas.Add(valor);
                }
            }
        }

        return string.Join('\n', lineas);
    }
}
