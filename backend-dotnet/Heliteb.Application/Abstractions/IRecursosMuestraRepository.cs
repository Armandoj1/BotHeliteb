namespace Heliteb.Application.Abstractions;

public class RecursosMuestraDto
{
    public DateTime MedidoEn { get; set; }
    public int? RamTotalMb { get; set; }
    public int? RamUsadoMb { get; set; }
    public decimal? DiscoTotalGb { get; set; }
    public decimal? DiscoUsadoGb { get; set; }
    public decimal? CpuLoad1m { get; set; }
}

public class RecursosPorHoraDto
{
    public int Hora { get; set; }
    public int? RamUsadoPromedioMb { get; set; }
    public int? RamUsadoMaxMb { get; set; }
    public decimal? CpuLoadPromedio { get; set; }
    public decimal? CpuLoadMax { get; set; }
}

public interface IRecursosMuestraRepository
{
    Task InsertarAsync(RecursosMuestraDto muestra, CancellationToken ct = default);

    Task<IReadOnlyList<RecursosMuestraDto>> ListarRecientesAsync(int horas, CancellationToken ct = default);

    Task<IReadOnlyList<RecursosPorHoraDto>> ResumenPorHoraAsync(DateTime desde, DateTime hasta, CancellationToken ct = default);

    /// <summary>Borra muestras mas viejas que el retention configurado, para no crecer sin limite.</summary>
    Task LimpiarAntiguasAsync(TimeSpan retencion, CancellationToken ct = default);
}
