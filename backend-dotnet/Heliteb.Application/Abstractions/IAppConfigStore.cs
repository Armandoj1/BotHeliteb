namespace Heliteb.Application.Abstractions;

/// <summary>
/// Almacén clave/valor simple para configuración que el panel necesita poder cambiar
/// en caliente (ej. SMTP) sin reiniciar la API — a diferencia de appsettings.json,
/// que solo se lee una vez al arrancar.
/// </summary>
public interface IAppConfigStore
{
    Task<string?> GetAsync(string clave, CancellationToken ct = default);

    Task SetAsync(string clave, string valor, CancellationToken ct = default);
}
