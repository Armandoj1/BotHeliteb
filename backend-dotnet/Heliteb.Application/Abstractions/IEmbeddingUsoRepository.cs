namespace Heliteb.Application.Abstractions;

public class EmbeddingUsoDto
{
    public string Proveedor { get; set; } = string.Empty;
    public int Caracteres { get; set; }
    public int TokensEstimados { get; set; }
    public decimal CostoEstimadoUsd { get; set; }
}

public class EmbeddingUsoResumenDto
{
    public string Proveedor { get; set; } = string.Empty;
    public int Llamadas { get; set; }
    public long Caracteres { get; set; }
    public long TokensEstimados { get; set; }
    public decimal CostoEstimadoUsd { get; set; }
}

/// <summary>
/// Registra cada llamada real a un proveedor de embeddings (Ollama u otro que
/// se agregue mas adelante) para poder comparar cuanto se llamo cada uno y
/// estimar el costo acumulado antes de decidir cual dejar en produccion.
/// </summary>
public interface IEmbeddingUsoRepository
{
    Task RegistrarAsync(EmbeddingUsoDto uso, CancellationToken ct = default);

    /// <summary>Resumen acumulado por proveedor desde la fecha indicada.</summary>
    Task<IReadOnlyList<EmbeddingUsoResumenDto>> ResumenPorProveedorAsync(DateTime desde, CancellationToken ct = default);
}
