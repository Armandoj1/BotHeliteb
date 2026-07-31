using System.Security.Cryptography;
using Heliteb.Application.Auth;

namespace Heliteb.Infrastructure.Auth;

/// <summary>
/// PBKDF2-HMAC-SHA256 usando solo el BCL - no se agrega una dependencia de hashing
/// al proyecto por una sola tabla de usuarios.
///
/// Formato guardado: <c>pbkdf2$iteraciones$salt_b64$hash_b64</c>. Las iteraciones
/// viajan dentro del hash para poder subirlas más adelante sin invalidar las
/// contraseñas ya existentes.
/// </summary>
public class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const string Prefix = "pbkdf2";
    private const int Iterations = 210_000; // Recomendación OWASP 2023 para PBKDF2-SHA256.
    private const int SaltBytes = 16;
    private const int HashBytes = 32;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltBytes);
        var hash = Derive(password, salt, Iterations);

        return string.Join('$', Prefix, Iterations, Convert.ToBase64String(salt), Convert.ToBase64String(hash));
    }

    public bool Verify(string password, string? storedHash)
    {
        if (string.IsNullOrWhiteSpace(storedHash))
        {
            return false;
        }

        var parts = storedHash.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix || !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        byte[] salt;
        byte[] expected;
        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expected = Convert.FromBase64String(parts[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actual = Derive(password, salt, iterations, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    private static byte[] Derive(string password, byte[] salt, int iterations, int length = HashBytes) =>
        Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, length);
}
