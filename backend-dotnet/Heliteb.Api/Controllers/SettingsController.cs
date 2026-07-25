using System.Text.Json;
using Dapper;
using Heliteb.Application.Abstractions;
using Heliteb.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class SmtpConfigRequest
{
    public string SmtpHost { get; set; } = null!;
    public int SmtpPort { get; set; }
    public string SmtpUser { get; set; } = null!;
    public string SmtpPassword { get; set; } = null!;
    public string FromName { get; set; } = null!;
}

/// <summary>Endpoints de administración para el panel.</summary>
[ApiController]
[Route("api")]
public class SettingsController : ControllerBase
{
    // Mismo naming policy que Program.cs (snake_case) - se usa para serializar el
    // override antes de guardarlo en app_config, con la misma forma que ya tenía
    // esa tabla desde el backend Python original (smtp_host, smtp_port, etc.).
    private static readonly JsonSerializerOptions SnakeCaseJson = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    private readonly INpgsqlConnectionFactory _connectionFactory;
    private readonly IAppConfigStore _appConfig;

    public SettingsController(INpgsqlConnectionFactory connectionFactory, IAppConfigStore appConfig)
    {
        _connectionFactory = connectionFactory;
        _appConfig = appConfig;
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> Metrics(CancellationToken ct)
    {
        using var conn = _connectionFactory.Create();
        var productos = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM productos WHERE activo = TRUE");
        var cotizaciones = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM cotizaciones");
        var asesores = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM asesores WHERE activo = TRUE");
        return Ok(new { productos, cotizaciones, asesores });
    }

    [HttpGet("smtp-config")]
    public async Task<IActionResult> ObtenerSmtpConfig(CancellationToken ct)
    {
        // Nunca se re-expone la contraseña guardada - solo si ya hay algo configurado.
        var json = await _appConfig.GetAsync("smtp", ct);
        return Ok(new { configurado = !string.IsNullOrWhiteSpace(json) });
    }

    [HttpPost("smtp-config")]
    public async Task<IActionResult> GuardarSmtpConfig([FromBody] SmtpConfigRequest request, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(request, SnakeCaseJson);
        await _appConfig.SetAsync("smtp", json, ct);
        return Ok(new { ok = true });
    }
}
