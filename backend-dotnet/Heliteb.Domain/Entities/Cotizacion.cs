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
    /// <summary>URL real en Cloudinary. No se le entrega al cliente.</summary>
    public string PdfUrl { get; set; } = null!;

    /// <summary>
    /// Token aleatorio del enlace publico (/c/{token}). Existe para no exponer
    /// ni el proveedor de archivos ni el folio, que lleva marca de tiempo y se
    /// podria enumerar para leer cotizaciones ajenas.
    /// </summary>
    public string? Token { get; set; }
    public DateTime CreatedAt { get; set; }
}
