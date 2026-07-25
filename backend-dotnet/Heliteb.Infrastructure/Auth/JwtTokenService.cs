using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Heliteb.Application.Auth;
using Heliteb.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace Heliteb.Infrastructure.Auth;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(JwtOptions options)
    {
        _options = options;
    }

    public string GenerarToken(Asesor asesor)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, asesor.Id.ToString()),
            new Claim("phone", asesor.Telefono),
            new Claim("name", asesor.Nombre),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_options.ExpiresHours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
