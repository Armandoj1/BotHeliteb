using Heliteb.Application.Catalog;
using Heliteb.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

[ApiController]
[Route("api")]
public class ProductsController : ControllerBase
{
    private readonly IProductQueries _productos;
    private readonly INpgsqlConnectionFactory _connectionFactory;

    public ProductsController(IProductQueries productos, INpgsqlConnectionFactory connectionFactory)
    {
        _productos = productos;
        _connectionFactory = connectionFactory;
    }

    [HttpGet("health")]
    public async Task<IActionResult> Health(CancellationToken ct)
    {
        using var conn = _connectionFactory.Create();
        var count = await Dapper.SqlMapper.ExecuteScalarAsync<int>(conn, "SELECT COUNT(*) FROM productos WHERE activo = TRUE");
        return Ok(new { ok = true, productos = count });
    }

    [HttpGet("products")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var productos = await _productos.GetAllAsync(ct);
        return Ok(productos);
    }
}
