namespace Heliteb.Application.Catalog.Dtos;

public class ProductoDto
{
    public string CodigoSap { get; set; } = null!;
    public string Marca { get; set; } = null!;
    public string Categoria { get; set; } = null!;
    public string? Linea { get; set; }
    public string? Serie { get; set; }
    public string? SubSerie { get; set; }
    public string Modelo { get; set; } = null!;
    public string? Parametro1 { get; set; }
    public string? Parametro2 { get; set; }
    public string? Parametro3 { get; set; }
    public string? Descripcion { get; set; }
    public string? ModeloEtiqueta { get; set; }
    public decimal? PrecioMsrpCop { get; set; }
    public int StockTotal { get; set; }
    public string? ImagenUrl { get; set; }

    /// <summary>
    /// EN_SEDE (hay unidades en mostrador) | EN_BODEGA_CENTRAL (hay, pero requiere
    /// traslado) | AGOTADO (lo manejamos, sin unidades) | BAJO_PEDIDO (no lo
    /// tenemos, se le compra al proveedor). Viene de vista_disponibilidad.
    /// </summary>
    public string? Disponibilidad { get; set; }

    public decimal UdsSedes { get; set; }
    public decimal UdsCentral { get; set; }

    /// <summary>
    /// FALSE cuando el inventario NO distingue esta variante de sus hermanas: en
    /// Odoo hay una sola ficha por familia (ej. un SKU DS-2CE16D0T-IRF que cubre
    /// el lente de 2.8mm y el de 3.6mm, que en la lista del proveedor son códigos
    /// SAP distintos). El agente debe advertirlo en vez de afirmar la variante.
    /// </summary>
    public bool VarianteExacta { get; set; } = true;

    /// <summary>El producto está duplicado en Odoo y su stock viene de varias fichas.</summary>
    public bool DuplicadoOdoo { get; set; }

    /// <summary>Sedes con unidades, ya legible: "A. BOGOTA: 11, A. CARTAGENA: 10".</summary>
    public string? DondeHay { get; set; }

    /// <summary>
    /// Identifica la pila física de inventario. Dos productos con el MISMO
    /// skuInventario comparten las mismas unidades (son variantes de lente de una
    /// sola referencia en bodega): sus cantidades NO se suman.
    /// </summary>
    public string? SkuInventario { get; set; }

    /// <summary>Desglose por bodega/sucursal, para el panel (ver Product Drawer). Vacío si no hay stock.</summary>
    public List<StockDto> StockBodegas { get; set; } = new();
}
