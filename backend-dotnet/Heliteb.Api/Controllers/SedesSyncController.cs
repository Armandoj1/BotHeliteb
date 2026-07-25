using System.Security.Cryptography;
using System.Text;
using Heliteb.Application.Agent;
using Heliteb.Application.Agent.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

public class SedesSyncRequest
{
    public List<SedeSyncItem> Sedes { get; set; } = new();
}

/// <summary>
/// Recibe desde n8n (workflow diario que lee el Sheet de sedes) la lista completa de
/// sedes vigente. Verificado por secreto compartido en query string (?key=), igual que
/// KommoWebhookController - no es un usuario logueado, es una llamada maquina-a-maquina.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("webhook/sedes-sync")]
public class SedesSyncController : ControllerBase
{
    private readonly IInformacionEmpresaRepository _empresa;
    private readonly IConfiguration _configuration;

    public SedesSyncController(IInformacionEmpresaRepository empresa, IConfiguration configuration)
    {
        _empresa = empresa;
        _configuration = configuration;
    }

    [HttpPost]
    public async Task<IActionResult> Sincronizar([FromQuery] string? key, [FromBody] SedesSyncRequest request, CancellationToken ct)
    {
        var expectedKey = _configuration["Webhook:N8nSyncSecret"];
        if (string.IsNullOrEmpty(expectedKey) || !FixedTimeEquals(key, expectedKey))
        {
            return Unauthorized();
        }

        var resultado = await _empresa.SincronizarSedesAsync(request.Sedes, ct);
        return Ok(resultado);
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
