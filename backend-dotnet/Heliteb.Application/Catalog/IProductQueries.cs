using Heliteb.Application.Catalog.Dtos;

namespace Heliteb.Application.Catalog;

public interface IProductQueries
{
    Task<IReadOnlyList<ProductoDto>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Búsqueda de productos: texto libre (semántica + código exacto) más filtros
    /// estructurados opcionales que se resuelven como SQL exacto (tipo de producto,
    /// canales, resolución, orden por precio).
    /// </summary>
    Task<IReadOnlyList<ProductoDto>> BuscarProductosAsync(string query, ProductoFiltros? filtros = null, int limit = 10, CancellationToken ct = default);

    /// <summary>Stock disponible por bodega para un modelo o código SAP.</summary>
    Task<IReadOnlyList<StockDto>> VerificarStockAsync(string query, CancellationToken ct = default);

    /// <summary>Productos relacionados (misma categoría/línea/marca) para venta cruzada.</summary>
    Task<IReadOnlyList<ProductoDto>> VentasCruzadasAsync(string query, int limit = 5, CancellationToken ct = default);

    Task<ProductoDto?> GetByCodigoSapAsync(string codigoSap, CancellationToken ct = default);
}
