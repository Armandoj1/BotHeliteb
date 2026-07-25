namespace Heliteb.Application.Cotizaciones;

/// <summary>
/// Lanzada cuando telefono_asesor no corresponde a un asesor registrado/activo,
/// o su verificación OTP (verificado_hasta) ya expiró. Es la barrera de seguridad
/// server-side contra bypasses de la memoria conversacional del agente.
/// </summary>
public class AsesorNoVerificadoException : Exception
{
    public AsesorNoVerificadoException(string telefono)
        : base($"El teléfono {telefono} no está registrado como asesor verificado.")
    {
    }
}
