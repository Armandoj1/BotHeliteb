using System.Text.Json;
using Heliteb.Application.Agent;
using Heliteb.Application.Asesores;

namespace Heliteb.Agent.Tools;

public class AsesorEstadoTool : IAgentTool
{
    private readonly IAsesorAuthService _auth;

    public AsesorEstadoTool(IAsesorAuthService auth)
    {
        _auth = auth;
    }

    public string Name => "estado_asesor";

    public string Description => "Consulta si el teléfono actual está registrado como asesor y si ya está verificado.";

    public string ParametersJsonSchema => """
        { "type": "object", "properties": { "telefono": { "type": "string" } }, "required": ["telefono"] }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        var target = ExtractTelefono(argumentsJson) ?? telefono;
        var estado = await _auth.EstadoAsync(target, ct);
        return ToolResult.Ok(estado);
    }

    internal static string? ExtractTelefono(string argumentsJson)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        return doc.RootElement.TryGetProperty("telefono", out var v) ? v.GetString() : null;
    }
}

public class AsesorSolicitarCodigoTool : IAgentTool
{
    private readonly IAsesorAuthService _auth;

    public AsesorSolicitarCodigoTool(IAsesorAuthService auth)
    {
        _auth = auth;
    }

    public string Name => "solicitar_codigo";

    public string Description => "Genera y envía por correo un código OTP de 6 dígitos para verificar al asesor.";

    public string ParametersJsonSchema => """
        { "type": "object", "properties": { "telefono": { "type": "string" } }, "required": ["telefono"] }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        var target = AsesorEstadoTool.ExtractTelefono(argumentsJson) ?? telefono;
        await _auth.SolicitarCodigoAsync(target, ct);
        return ToolResult.Ok(new { ok = true });
    }
}

public class AsesorVerificarCodigoTool : IAgentTool
{
    private readonly IAsesorAuthService _auth;

    public AsesorVerificarCodigoTool(IAsesorAuthService auth)
    {
        _auth = auth;
    }

    public string Name => "verificar_codigo";

    public string Description => "Valida el código OTP de 6 dígitos enviado al asesor.";

    public string ParametersJsonSchema => """
        { "type": "object", "properties": { "telefono": { "type": "string" }, "codigo": { "type": "string" } }, "required": ["telefono", "codigo"] }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var root = doc.RootElement;
        var target = root.TryGetProperty("telefono", out var v) ? v.GetString() ?? telefono : telefono;
        var codigo = root.GetProperty("codigo").GetString() ?? string.Empty;

        var resultado = await _auth.VerificarCodigoAsync(target, codigo, ct);
        return ToolResult.Ok(resultado);
    }
}
