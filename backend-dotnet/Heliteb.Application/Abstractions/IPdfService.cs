namespace Heliteb.Application.Abstractions;

public class CotizacionPdfLinea
{
    public string CodigoSap { get; set; } = null!;
    public string Modelo { get; set; } = null!;
    public string? Descripcion { get; set; }
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
}

public class CotizacionPdfModel
{
    public string Folio { get; set; } = null!;
    public string Cliente { get; set; } = null!;
    public string? Asesor { get; set; }
    public IReadOnlyList<CotizacionPdfLinea> Lineas { get; set; } = Array.Empty<CotizacionPdfLinea>();
    public decimal Subtotal { get; set; }
    public decimal Iva { get; set; }
    public decimal Total { get; set; }
}

public interface IPdfService
{
    byte[] GenerarCotizacionPdf(CotizacionPdfModel model);
}
