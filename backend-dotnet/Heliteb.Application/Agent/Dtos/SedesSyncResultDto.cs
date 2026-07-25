namespace Heliteb.Application.Agent.Dtos;

/// <summary>
/// Resumen de una sincronizacion de sedes desde el Sheet: solo agrega/actualiza,
/// nunca borra (sedes.id tiene FK con ON DELETE CASCADE desde asesores_sede, borrar
/// una sede automaticamente se llevaria por delante sus contactos de asesor).
/// </summary>
public class SedesSyncResultDto
{
    public int Insertadas { get; set; }
    public int Actualizadas { get; set; }
    public int SinCambios { get; set; }
    public List<string> NoEncontradasEnSheet { get; set; } = new();
}
