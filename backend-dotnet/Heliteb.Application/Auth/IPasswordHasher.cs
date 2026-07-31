namespace Heliteb.Application.Auth;

/// <summary>
/// Hashing de contraseñas del panel. Se mantiene como puerto en Application para
/// que el algoritmo concreto (hoy PBKDF2) sea reemplazable sin tocar controllers
/// ni repositorios.
/// </summary>
public interface IPasswordHasher
{
    /// <summary>Devuelve el hash serializado, listo para guardar en asesores.password_hash.</summary>
    string Hash(string password);

    /// <summary>
    /// Verifica en tiempo constante. Un hash nulo o vacío (asesor sin contraseña
    /// definida) siempre devuelve false.
    /// </summary>
    bool Verify(string password, string? storedHash);
}
