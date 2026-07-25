using System.Globalization;
using System.Text;

namespace Heliteb.Infrastructure.Data;

/// <summary>Formatea un float[] al literal de texto que pgvector espera ("[0.1,0.2,...]").</summary>
public static class PgVectorFormat
{
    public static string ToLiteral(IReadOnlyList<float> vector)
    {
        var sb = new StringBuilder(vector.Count * 10 + 2);
        sb.Append('[');
        for (var i = 0; i < vector.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append(vector[i].ToString("G9", CultureInfo.InvariantCulture));
        }
        sb.Append(']');
        return sb.ToString();
    }
}
