using System.Security.Cryptography;
using System.Text;
using Heliteb.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

/// <summary>
/// Uso real de RAM/disco/CPU del servidor. Visible para cualquier asesor logueado en
/// el panel (sección "Recursos") - es informativo sobre la salud del servidor, no hay
/// motivo para ocultarlo de quien administra el sistema.
/// </summary>
[ApiController]
[Route("api/system")]
public class SystemResourcesController : ControllerBase
{
    private readonly ISystemResourcesService _recursos;
    private readonly IRecursosMuestraRepository _muestras;

    public SystemResourcesController(ISystemResourcesService recursos, IRecursosMuestraRepository muestras)
    {
        _recursos = recursos;
        _muestras = muestras;
    }

    [HttpGet("recursos")]
    public async Task<IActionResult> Actual(CancellationToken ct)
    {
        var actual = await _recursos.LeerAsync(ct);
        var recientes = await _muestras.ListarRecientesAsync(24, ct);
        return Ok(new { actual, historico_24h = recientes });
    }
}

public class ReporteRecursosRequest
{
    public string? Motivo { get; set; }
}

/// <summary>
/// Genera y envía por correo el reporte diario de consumo de recursos (RAM/disco/CPU
/// promedio y pico por hora del día anterior) - lo dispara n8n todos los días a las
/// 8:15 AM. Verificado por secreto compartido, igual que los demás webhooks de sync.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("webhook/reporte-recursos")]
public class ReporteRecursosController : ControllerBase
{
    private readonly IRecursosMuestraRepository _muestras;
    private readonly IEmailService _email;
    private readonly IConfiguration _configuration;

    public ReporteRecursosController(IRecursosMuestraRepository muestras, IEmailService email, IConfiguration configuration)
    {
        _muestras = muestras;
        _email = email;
        _configuration = configuration;
    }

    [HttpPost]
    public async Task<IActionResult> Generar([FromQuery] string? key, CancellationToken ct)
    {
        var expectedKey = _configuration["Webhook:N8nSyncSecret"];
        if (string.IsNullOrEmpty(expectedKey) || !FixedTimeEquals(key, expectedKey))
        {
            return Unauthorized();
        }

        var hoy = DateTime.UtcNow.Date;
        var ayer = hoy.AddDays(-1);
        var resumen = await _muestras.ResumenPorHoraAsync(ayer, hoy, ct);

        if (resumen.Count == 0)
        {
            return Ok(new { enviado = false, motivo = "No hay muestras del día anterior todavía." });
        }

        var picoRam = resumen.OrderByDescending(r => r.RamUsadoMaxMb).First();
        var picoCpu = resumen.OrderByDescending(r => r.CpuLoadMax).First();

        var cuerpo = new StringBuilder();
        cuerpo.AppendLine($"Consumo de recursos del servidor — {ayer:dd/MM/yyyy}\n");
        cuerpo.AppendLine("RESUMEN POR HORA (RAM promedio / pico en MB, carga de CPU promedio / pico):");
        foreach (var h in resumen)
        {
            cuerpo.AppendLine($"  {h.Hora:00}:00 — RAM {h.RamUsadoPromedioMb} / {h.RamUsadoMaxMb} MB · CPU {h.CpuLoadPromedio:0.00} / {h.CpuLoadMax:0.00}");
        }
        cuerpo.AppendLine();
        cuerpo.AppendLine($"Hora de mayor uso de RAM: {picoRam.Hora:00}:00 ({picoRam.RamUsadoMaxMb} MB)");
        cuerpo.AppendLine($"Hora de mayor carga de CPU: {picoCpu.Hora:00}:00 ({picoCpu.CpuLoadMax:0.00})");

        var adminEmail = _configuration["Alertas:AdminEmail"];
        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            await _email.SendAlertaAsync(adminEmail, $"HELITEB — Reporte de recursos del servidor ({ayer:dd/MM/yyyy})", cuerpo.ToString(), ct);
        }

        return Ok(new { enviado = true, resumen_por_hora = resumen });
    }

    private static bool FixedTimeEquals(string? provided, string expected)
    {
        if (provided is null) return false;

        var providedBytes = Encoding.UTF8.GetBytes(provided);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return providedBytes.Length == expectedBytes.Length &&
            CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
    }
}
