using Heliteb.Agent.Tools;
using Heliteb.Application.Agent;
using Microsoft.Extensions.DependencyInjection;

namespace Heliteb.Agent;

public static class DependencyInjection
{
    public static IServiceCollection AddAgent(this IServiceCollection services)
    {
        services.AddScoped<IAgentTool, BuscarProductosTool>();
        services.AddScoped<IAgentTool, VerificarStockTool>();
        services.AddScoped<IAgentTool, VentasCruzadasTool>();
        services.AddScoped<IAgentTool, GenerarCotizacionTool>();
        services.AddScoped<IAgentTool, EnviarEmailCotizacionTool>();
        services.AddScoped<IAgentTool, EnviarWhatsAppCotizacionTool>();
        services.AddScoped<IAgentTool, AsesorEstadoTool>();
        services.AddScoped<IAgentTool, AsesorSolicitarCodigoTool>();
        services.AddScoped<IAgentTool, AsesorVerificarCodigoTool>();
        services.AddScoped<IAgentTool, ConsultarDirectorioEmpresaTool>();
        services.AddScoped<IAgentTool, ConsultarGarantiaTool>();
        services.AddScoped<IAgentTool, ConsultarMediosPagoTool>();

        services.AddScoped<ToolRegistry>();
        services.AddScoped<IAgentOrchestrator, AgentOrchestrator>();

        return services;
    }
}
