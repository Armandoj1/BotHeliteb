using System.Globalization;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Monitoring;

/// <summary>
/// Lee /proc/meminfo y /proc/loadavg directamente - en Docker sobre Linux, sin límites
/// de memoria configurados en el contenedor, estos archivos reflejan el host real, no
/// un valor virtualizado por contenedor. El disco se lee de /hostfs si el docker-compose
/// lo monta de solo lectura (- /:/hostfs:ro); si no existe (ej. Windows en desarrollo
/// local), cae a la vista del propio contenedor.
/// </summary>
public class LinuxProcSystemResourcesService : ISystemResourcesService
{
    private const string MemInfoPath = "/proc/meminfo";
    private const string LoadAvgPath = "/proc/loadavg";
    private static readonly string DiscoPath = Directory.Exists("/hostfs") ? "/hostfs" : "/";

    public Task<SystemResourcesSnapshot> LeerAsync(CancellationToken ct = default)
    {
        if (!File.Exists(MemInfoPath))
        {
            return Task.FromResult(new SystemResourcesSnapshot { Disponible = false });
        }

        try
        {
            var snapshot = new SystemResourcesSnapshot { Disponible = true };

            var mem = ParseMemInfo();
            if (mem.TryGetValue("MemTotal", out var totalKb)) snapshot.RamTotalMb = (int)(totalKb / 1024);
            if (mem.TryGetValue("MemAvailable", out var availKb) && mem.TryGetValue("MemTotal", out var totalKb2))
            {
                snapshot.RamUsadoMb = (int)((totalKb2 - availKb) / 1024);
            }

            if (File.Exists(LoadAvgPath))
            {
                var partes = File.ReadAllText(LoadAvgPath).Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (partes.Length > 0 && decimal.TryParse(partes[0], NumberStyles.Any, CultureInfo.InvariantCulture, out var load1m))
                {
                    snapshot.CpuLoad1m = load1m;
                }
            }

            try
            {
                var drive = new DriveInfo(DiscoPath);
                snapshot.DiscoTotalGb = Math.Round(drive.TotalSize / 1024m / 1024 / 1024, 2);
                snapshot.DiscoUsadoGb = Math.Round((drive.TotalSize - drive.AvailableFreeSpace) / 1024m / 1024 / 1024, 2);
            }
            catch
            {
                // Disco no disponible en este entorno - se deja null, el resto de metricas sigue siendo util.
            }

            return Task.FromResult(snapshot);
        }
        catch
        {
            return Task.FromResult(new SystemResourcesSnapshot { Disponible = false });
        }
    }

    private static Dictionary<string, long> ParseMemInfo()
    {
        var resultado = new Dictionary<string, long>();
        foreach (var linea in File.ReadAllLines(MemInfoPath))
        {
            var partes = linea.Split(':', 2);
            if (partes.Length != 2) continue;

            var valor = partes[1].Trim().Replace(" kB", "");
            if (long.TryParse(valor, out var kb))
            {
                resultado[partes[0].Trim()] = kb;
            }
        }
        return resultado;
    }
}
