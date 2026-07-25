namespace Heliteb.Infrastructure.Auth;

public class JwtOptions
{
    public string SigningKey { get; set; } = null!;
    public string Issuer { get; set; } = "heliteb-api";
    public string Audience { get; set; } = "heliteb-panel";
    public int ExpiresHours { get; set; } = 12;
}
