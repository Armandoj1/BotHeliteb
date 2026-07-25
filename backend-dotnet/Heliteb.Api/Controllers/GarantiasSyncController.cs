using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Heliteb.Application.Abstractions;
using Heliteb.Infrastructure.Documents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

internal class GarantiasCheckState
{
    public string ModifiedTime { get; set; } = null!;
    public string Texto { get; set; } = "";
}

/// <summary>
/// Recibe desde n8n (workflow diario) el archivo de politicas de garantia en Drive
/// (metadata + bytes). Extrae el texto del .pptx y calcula que lineas se agregaron o
/// se quitaron respecto a la ultima version conocida - asi un humano ve EXACTAMENTE
/// que cambio (ej. "Garantia Hikvision DVR: 12 meses" -> "...: 18 meses" aparece como
/// una linea quitada + una agregada) sin tener que releer todo el documento.
///
/// No actualiza garantias/garantia_politicas solo - el texto de un pptx no tiene
/// estructura fija para saber a que fila de la BD corresponde cada cambio, y aplicar
/// eso mal corrompería informacion de garantia que ve un cliente. El diff es para que
/// alguien aplique el cambio a mano, informado, no a ciegas releyendo el archivo entero.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("webhook/garantias-check")]
public class GarantiasSyncController : ControllerBase
{
    private const string ConfigKey = "garantias_pptx_check";

    private readonly IAppConfigStore _appConfig;
    private readonly IEmailService _email;
    private readonly IConfiguration _configuration;

    public GarantiasSyncController(IAppConfigStore appConfig, IEmailService email, IConfiguration configuration)
    {
        _appConfig = appConfig;
        _email = email;
        _configuration = configuration;
    }

    [HttpPost]
    public async Task<IActionResult> Verificar(
        [FromQuery] string? key,
        [FromForm] string fileName,
        [FromForm] string modifiedTime,
        IFormFile archivo,
        CancellationToken ct)
    {
        var expectedKey = _configuration["Webhook:N8nSyncSecret"];
        if (string.IsNullOrEmpty(expectedKey) || !FixedTimeEquals(key, expectedKey))
        {
            return Unauthorized();
        }

        var storedJson = await _appConfig.GetAsync(ConfigKey, ct);
        var stored = string.IsNullOrWhiteSpace(storedJson) ? null : JsonSerializer.Deserialize<GarantiasCheckState>(storedJson);

        if (stored is not null && stored.ModifiedTime == modifiedTime)
        {
            return Ok(new { cambio = false, archivo = fileName, modificado_en = modifiedTime });
        }

        string textoNuevo;
        using (var stream = archivo.OpenReadStream())
        {
            textoNuevo = PptxTextExtractor.ExtractText(stream);
        }

        var lineasAnteriores = new HashSet<string>(
            (stored?.Texto ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        var lineasNuevas = new HashSet<string>(
            textoNuevo.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

        var agregadas = lineasNuevas.Except(lineasAnteriores).ToList();
        var eliminadas = lineasAnteriores.Except(lineasNuevas).ToList();
        var esPrimeraVez = stored is null;

        var adminEmail = _configuration["Alertas:AdminEmail"];
        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            var cuerpo = new StringBuilder();
            cuerpo.AppendLine($"El archivo \"{fileName}\" cambió en Google Drive.\n");
            if (esPrimeraVez)
            {
                cuerpo.AppendLine("Es la primera vez que se registra este archivo - no hay una versión anterior para comparar.");
            }
            else
            {
                if (agregadas.Count > 0)
                {
                    cuerpo.AppendLine("LÍNEAS NUEVAS / MODIFICADAS:");
                    foreach (var l in agregadas) cuerpo.AppendLine($"  + {l}");
                    cuerpo.AppendLine();
                }
                if (eliminadas.Count > 0)
                {
                    cuerpo.AppendLine("LÍNEAS QUE YA NO ESTÁN:");
                    foreach (var l in eliminadas) cuerpo.AppendLine($"  - {l}");
                    cuerpo.AppendLine();
                }
                if (agregadas.Count == 0 && eliminadas.Count == 0)
                {
                    cuerpo.AppendLine("El archivo se volvió a guardar pero el texto no cambió.");
                }
            }
            cuerpo.AppendLine("\nEsto NO se aplicó automáticamente a la base de datos (garantias / garantia_politicas) — revisa y actualiza a mano si aplica.");

            await _email.SendAlertaAsync(adminEmail, "HELITEB — Cambió el archivo de políticas de garantía", cuerpo.ToString(), ct);
        }

        await _appConfig.SetAsync(
            ConfigKey,
            JsonSerializer.Serialize(new GarantiasCheckState { ModifiedTime = modifiedTime, Texto = textoNuevo }),
            ct);

        return Ok(new
        {
            cambio = true,
            primera_vez = esPrimeraVez,
            archivo = fileName,
            modificado_en = modifiedTime,
            lineas_agregadas = agregadas,
            lineas_eliminadas = eliminadas,
        });
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
