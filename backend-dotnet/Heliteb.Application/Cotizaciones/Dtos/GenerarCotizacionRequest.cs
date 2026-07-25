namespace Heliteb.Application.Cotizaciones.Dtos;

public class GenerarCotizacionRequest
{
    public IReadOnlyList<string> CodigosSap { get; set; } = Array.Empty<string>();
    public string ClienteNombre { get; set; } = null!;
    public string? ClienteEmail { get; set; }
    public string Asesor { get; set; } = null!;

    /// <summary>
    /// Obligatorio: el backend SIEMPRE re-valida que este teléfono corresponde a un
    /// asesor registrado, activo y con OTP vigente antes de emitir la cotización.
    /// Nunca se confía en que el agente/LLM ya lo haya verificado en su memoria.
    /// </summary>
    public string TelefonoAsesor { get; set; } = null!;
}

public class CotizacionResultDto
{
    public string Folio { get; set; } = null!;
    public decimal Total { get; set; }
    public string PdfUrl { get; set; } = null!;
}
