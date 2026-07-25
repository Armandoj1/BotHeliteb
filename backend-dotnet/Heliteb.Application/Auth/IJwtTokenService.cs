using Heliteb.Domain.Entities;

namespace Heliteb.Application.Auth;

public interface IJwtTokenService
{
    string GenerarToken(Asesor asesor);
}
