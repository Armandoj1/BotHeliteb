using Heliteb.Application.Abstractions;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Heliteb.Infrastructure.Pdf;

/// <summary>
/// Reemplaza el shell-out a Edge/Chrome headless (--print-to-pdf) del backend Python:
/// genera el PDF en proceso con QuestPDF, sin depender de un navegador externo.
/// </summary>
public class QuestPdfService : IPdfService
{
    static QuestPdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerarCotizacionPdf(CotizacionPdfModel model)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text("HELITEB SAS — Cotización").FontSize(18).Bold();
                    col.Item().Text($"Folio: {model.Folio}");
                    col.Item().Text($"Cliente: {model.Cliente}");
                    if (!string.IsNullOrWhiteSpace(model.Asesor))
                    {
                        col.Item().Text($"Asesor: {model.Asesor}");
                    }
                });

                page.Content().PaddingVertical(15).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(2);
                        columns.RelativeColumn(4);
                        columns.RelativeColumn(1);
                        columns.RelativeColumn(2);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Text("Código SAP").Bold();
                        header.Cell().Text("Modelo").Bold();
                        header.Cell().Text("Cant.").Bold();
                        header.Cell().Text("Precio").Bold();
                    });

                    foreach (var linea in model.Lineas)
                    {
                        table.Cell().Text(linea.CodigoSap);
                        table.Cell().Text(linea.Modelo);
                        table.Cell().Text(linea.Cantidad.ToString());
                        table.Cell().Text(linea.PrecioUnitario.ToString("C0"));
                    }
                });

                page.Footer().AlignRight().Column(col =>
                {
                    col.Item().Text($"Subtotal: {model.Subtotal:C0}");
                    col.Item().Text($"IVA: {model.Iva:C0}");
                    col.Item().Text($"Total: {model.Total:C0}").Bold();
                });
            });
        });

        return document.GeneratePdf();
    }
}
