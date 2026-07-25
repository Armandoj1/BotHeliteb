namespace Heliteb.Application.Abstractions;

public class SystemResourcesSnapshot
{
    public bool Disponible { get; set; }
    public int? RamTotalMb { get; set; }
    public int? RamUsadoMb { get; set; }
    public decimal? DiscoTotalGb { get; set; }
    public decimal? DiscoUsadoGb { get; set; }
    public decimal? CpuLoad1m { get; set; }
}

/// <summary>
/// Lee el uso real de RAM/disco/CPU del servidor donde corre el contenedor. En Linux
/// (VPS de producción) lee /proc directamente - Docker no aisla estos archivos por
/// contenedor a menos que se configuren límites de memoria, así que reflejan el
/// host real. En Windows (dev local) no hay /proc: Disponible queda en false.
/// </summary>
public interface ISystemResourcesService
{
    Task<SystemResourcesSnapshot> LeerAsync(CancellationToken ct = default);
}
