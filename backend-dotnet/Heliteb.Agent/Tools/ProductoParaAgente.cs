using System.Text.RegularExpressions;
using Heliteb.Application.Catalog.Dtos;

namespace Heliteb.Agent.Tools;

/// <summary>
/// Versión recortada de un producto, para lo que se le manda al LLM.
///
/// Devolver el <see cref="ProductoDto"/> completo costaba ~1.080 caracteres por
/// producto y, a 10 productos por búsqueda, ~7.600 por llamada. Como cada turno
/// reenvía TODO el historial al modelo, cuatro búsquedas dejaban la petición en
/// ~9.000 tokens: cada llamada tardaba más, costaba más, y Groq (mucho más
/// rápido que DeepSeek) la rechazaba de plano con 413 por su tope de 8.000
/// tokens por minuto.
///
/// Lo que se quita es lo que el modelo nunca usa para responder: la URL de la
/// imagen (no la puede mostrar y sale del código SAP), el modelo de etiqueta
/// (repite el modelo), serie y sub-serie, el desglose de bodegas vacío, y el
/// stock total (duplica las unidades en sede). La descripción se recorta: venía
/// con 380 caracteres de ficha técnica en inglés.
/// </summary>
public record ProductoParaAgente(
    string CodigoSap,
    string Marca,
    string? Categoria,
    string Modelo,
    string? Tipo,
    string? Alcance,
    string? Descripcion,
    decimal? Precio,
    // Se conserva aunque UdsSedes diga casi lo mismo: el system prompt tiene
    // media docena de reglas escritas sobre stockTotal (agotado vs inexistente,
    // alternativas, cuándo dejar de reformular la búsqueda). Cuesta 1-3
    // caracteres; renombrarlo obligaría a reescribir esas reglas y arriesgar el
    // comportamiento por un ahorro nulo.
    int StockTotal,
    string? Disponibilidad,
    decimal UdsSedes,
    decimal? UdsCentral,
    string? DondeHay,
    bool? VarianteCompartida,
    string? SkuInventario)
{
    private const int MaxDescripcion = 160;

    /// <summary>El Excel del proveedor trae saltos de línea escapados como
    /// literal "_x000D_", que llegaban tal cual al prompt.</summary>
    private static readonly Regex BasuraExcel = new(@"_x000D_|\s+", RegexOptions.Compiled);

    public static ProductoParaAgente Desde(ProductoDto p)
    {
        // SkuInventario solo importa cuando varias variantes comparten inventario:
        // es la señal que el prompt usa para no sumar las mismas unidades dos veces.
        var compartida = !p.VarianteExacta;

        return new ProductoParaAgente(
            p.CodigoSap,
            p.Marca,
            p.Categoria,
            p.Modelo,
            p.Parametro1,
            p.Parametro2,
            Recortar(p.Descripcion),
            p.PrecioMsrpCop,
            p.StockTotal,
            p.Disponibilidad,
            p.UdsSedes,
            p.UdsCentral > 0 ? p.UdsCentral : null,
            p.DondeHay,
            compartida ? true : null,
            compartida ? p.SkuInventario : null);
    }

    private static string? Recortar(string? descripcion)
    {
        if (string.IsNullOrWhiteSpace(descripcion)) return null;

        var limpio = BasuraExcel.Replace(descripcion, " ").Trim();
        return limpio.Length <= MaxDescripcion ? limpio : limpio[..MaxDescripcion].TrimEnd() + "…";
    }
}
