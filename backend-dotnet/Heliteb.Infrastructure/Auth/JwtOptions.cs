namespace Heliteb.Infrastructure.Auth;

public class JwtOptions
{
    public string SigningKey { get; set; } = null!;
    public string Issuer { get; set; } = "heliteb-api";
    public string Audience { get; set; } = "heliteb-panel";
    /// <summary>
    /// 30 días. El panel lo usa un equipo comercial que entra a diario desde el
    /// mismo equipo; con 12 horas quedaban fuera cada mañana. El token no es
    /// revocable, así que el precio de esto es que desactivar a un asesor no lo
    /// saca de su sesión hasta que expire: si eso llega a importar, la solución
    /// es un refresh token con lista de revocación, no bajar otra vez la duración.
    /// </summary>
    public int ExpiresHours { get; set; } = 720;
}
