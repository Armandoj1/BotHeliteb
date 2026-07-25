using Heliteb.Application.Cotizaciones.Dtos;
using Heliteb.Domain.Entities;

namespace Heliteb.Application.Cotizaciones;

public interface ICotizacionService
{
    /// <summary>
    /// Genera la cotización. Lanza <see cref="AsesorNoVerificadoException"/> si
    /// TelefonoAsesor no está registrado/activo/verificado, sin excepción alguna.
    /// </summary>
    Task<CotizacionResultDto> GenerarAsync(GenerarCotizacionRequest request, CancellationToken ct = default);

    Task<Cotizacion?> GetByFolioAsync(string folio, CancellationToken ct = default);

    Task<IReadOnlyList<Cotizacion>> ListAsync(CancellationToken ct = default);

    Task EnviarPorEmailAsync(string folio, string destino, CancellationToken ct = default);

    Task EnviarPorWhatsAppAsync(string folio, string destino, CancellationToken ct = default);
}
