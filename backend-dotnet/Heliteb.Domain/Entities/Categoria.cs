namespace Heliteb.Domain.Entities;

public class Categoria
{
    public int IdCategoria { get; set; }
    public string Nombre { get; set; } = null!;
    public int? IdPadre { get; set; }
}
