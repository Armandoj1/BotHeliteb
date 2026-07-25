namespace Heliteb.Domain.Entities;

public class Producto
{
    public string CodigoSap { get; set; } = null!;
    public int? IdMarca { get; set; }
    public int? IdCategoria { get; set; }
    public string? Linea { get; set; }
    public string? Serie { get; set; }
    public string? SubSerie { get; set; }
    public string Modelo { get; set; } = null!;
    public string? Parametro1 { get; set; }
    public string? Parametro2 { get; set; }
    public string? Parametro3 { get; set; }
    public string? Descripcion { get; set; }
    public string? ModeloEtiqueta { get; set; }
    public bool Activo { get; set; } = true;
    public int? OdooProductId { get; set; }
    public string? OdooDefaultCode { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime FechaActualizacion { get; set; }
}
