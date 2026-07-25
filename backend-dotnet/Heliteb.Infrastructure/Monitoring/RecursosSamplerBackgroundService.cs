using Heliteb.Application.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Heliteb.Infrastructure.Monitoring;

/// <summary>
/// Toma una muestra de RAM/disco/CPU cada 15 minutos y la guarda en recursos_muestra,
/// para poder ver consumo histórico por hora (panel "Recursos" y reporte diario 8:15am).
/// Si el entorno no soporta lectura de recursos (ej. Windows en desarrollo local), no
/// hace nada - no falla el arranque de la API por esto.
/// </summary>
public class RecursosSamplerBackgroundService : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan Retencion = TimeSpan.FromDays(35);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RecursosSamplerBackgroundService> _logger;

    public RecursosSamplerBackgroundService(IServiceScopeFactory scopeFactory, ILogger<RecursosSamplerBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var recursos = scope.ServiceProvider.GetRequiredService<ISystemResourcesService>();
                var repo = scope.ServiceProvider.GetRequiredService<IRecursosMuestraRepository>();

                var snapshot = await recursos.LeerAsync(stoppingToken);
                if (snapshot.Disponible)
                {
                    await repo.InsertarAsync(new RecursosMuestraDto
                    {
                        RamTotalMb = snapshot.RamTotalMb,
                        RamUsadoMb = snapshot.RamUsadoMb,
                        DiscoTotalGb = snapshot.DiscoTotalGb,
                        DiscoUsadoGb = snapshot.DiscoUsadoGb,
                        CpuLoad1m = snapshot.CpuLoad1m,
                    }, stoppingToken);

                    await repo.LimpiarAntiguasAsync(Retencion, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo tomar la muestra de recursos del sistema.");
            }

            try
            {
                await Task.Delay(Intervalo, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
