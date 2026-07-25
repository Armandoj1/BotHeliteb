using Heliteb.Application.Agent;

namespace Heliteb.Agent.Tools;

public class ConsultarMediosPagoTool : IAgentTool
{
    private readonly IInformacionEmpresaRepository _info;

    public ConsultarMediosPagoTool(IInformacionEmpresaRepository info)
    {
        _info = info;
    }

    public string Name => "consultar_medios_pago";

    public string Description => "Consulta los medios de pago que acepta HELITEB (efectivo, datáfono, QR, transferencias, PSE, ADDI, Mercado Pago, contraentrega) y sus tiempos de validación. Úsala cuando pregunten cómo pueden pagar.";

    public string ParametersJsonSchema => """{ "type": "object", "properties": {} }""";

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        var medios = await _info.GetMediosPagoAsync(ct);
        return ToolResult.Ok(new { medios });
    }
}
