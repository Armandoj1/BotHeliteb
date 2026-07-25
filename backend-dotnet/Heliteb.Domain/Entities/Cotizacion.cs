namespace Heliteb.Domain.Entities;

public class Cotizacion
{
    public int Id { get; set; }
    public string Folio { get; set; } = null!;
    public string Cliente { get; set; } = null!;
    public string? ClienteEmail { get; set; }
    public string? Asesor { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Iva { get; set; }
    public decimal Total { get; set; }
    public int ProductosCount { get; set; }
    public string? ProductosJson { get; set; }
    public string PdfUrl { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
