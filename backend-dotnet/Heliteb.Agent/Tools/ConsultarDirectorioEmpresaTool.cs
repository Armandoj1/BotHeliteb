using System.Text.Json;
using Heliteb.Application.Agent;

namespace Heliteb.Agent.Tools;

public class ConsultarDirectorioEmpresaTool : IAgentTool
{
    private readonly IInformacionEmpresaRepository _info;

    public ConsultarDirectorioEmpresaTool(IInformacionEmpresaRepository info)
    {
        _info = info;
    }

    public string Name => "consultar_directorio_empresa";

    public string Description => "Consulta el directorio interno de HELITEB: responsables/contactos por área (cartera, contabilidad, garantías, talento humano, logística, compras, marketing, etc.) y/o las sedes físicas (ciudad, dirección, teléfono, y el/los asesor(es) comercial(es) de esa sede a quien el cliente debe acercarse presencialmente). Úsala cuando pregunten quién es el responsable de un área, a qué asesor acercarse en una sede, o dónde queda una sede.";

    public string ParametersJsonSchema => """
        {
          "type": "object",
          "properties": {
            "tipo": {
              "type": "string",
              "enum": ["contacto", "sede", "ambos"],
              "description": "'contacto' para responsables/áreas de la empresa, 'sede' para ubicaciones físicas, 'ambos' si no está claro o se piden los dos."
            },
            "filtro": {
              "type": "string",
              "description": "Texto para acotar la búsqueda: nombre de área/cargo (ej. 'cartera', 'garantías', 'logística') o ciudad (ej. 'Barranquilla'). Déjalo vacío para traer todo."
            }
          },
          "required": ["tipo"]
        }
        """;

    public async Task<ToolResult> ExecuteAsync(string argumentsJson, string telefono, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(argumentsJson);
        var root = doc.RootElement;
        var tipo = root.TryGetProperty("tipo", out var t) ? t.GetString() : "ambos";
        var filtro = root.TryGetProperty("filtro", out var f) && f.ValueKind == JsonValueKind.String ? f.GetString() : null;

        object resultado = tipo switch
        {
            "contacto" => new { contactos = await _info.BuscarContactosAsync(filtro, ct) },
            "sede" => new
            {
                sedes = await _info.BuscarSedesAsync(filtro, ct),
                asesoresPorSede = await _info.BuscarAsesoresSedeAsync(filtro, ct),
            },
            _ => new
            {
                contactos = await _info.BuscarContactosAsync(filtro, ct),
                sedes = await _info.BuscarSedesAsync(filtro, ct),
                asesoresPorSede = await _info.BuscarAsesoresSedeAsync(filtro, ct),
            },
        };

        return ToolResult.Ok(resultado);
    }
}
