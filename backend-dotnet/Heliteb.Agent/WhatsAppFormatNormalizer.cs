using System.Text;
using System.Text.RegularExpressions;

namespace Heliteb.Agent;

/// <summary>
/// El prompt le pide al LLM formato nativo de WhatsApp (un solo *asterisco* para
/// negrita, nada de **, tablas, HTML), pero un LLM no sigue esa instrucción al
/// 100% de las veces — en la práctica DeepSeek mezcla Markdown estándar (**negrita**,
/// encabezados #, tablas con |) con el formato que sí pide. En vez de confiar solo en
/// el prompt, se normaliza el texto de forma determinística antes de enviarlo.
/// </summary>
public static partial class WhatsAppFormatNormalizer
{
    public static string Normalize(string text)
    {
        // Tablas Markdown -> lista con guiones (antes de tocar "|", para poder leer
        // las celdas). Sin esto, quitar las barras a lo bruto deja columnas pegadas
        // con espacios sueltos, ilegible en WhatsApp.
        text = ConvertTablesToLists(text);

        // **negrita** / __negrita__ (Markdown estándar) -> *negrita* (WhatsApp)
        text = DoubleAsteriskBold().Replace(text, "*$1*");
        text = DoubleUnderscoreBold().Replace(text, "*$1*");

        // Encabezados "### Titulo" -> "*Titulo*"
        text = MarkdownHeading().Replace(text, "*$1*");

        // Citas "> texto" -> "texto"
        text = BlockQuote().Replace(text, "$1");

        // Cualquier etiqueta HTML suelta
        text = HtmlTag().Replace(text, string.Empty);

        // El LLM a veces mezcla dos negritas superpuestas en la misma línea (ej. todo
        // el renglón Y el precio), reutilizando asteriscos: "*1. Modelo - *$100**".
        // Eso rompe el emparejamiento simple de WhatsApp (cada * alterna negrita on/off,
        // sin anidar). Se corrige línea por línea: colapsa "**"/"***" a un solo "*", y
        // si queda un número impar de asteriscos sueltos, se quita el último para que
        // la negrita no se quede "encendida" y se filtre al resto del mensaje.
        text = BalanceAsterisksPerLine(text);

        // Colapsa saltos de línea excesivos que puede dejar la limpieza anterior
        text = ExtraBlankLines().Replace(text, "\n\n");

        return text.Trim();
    }

    private static string BalanceAsterisksPerLine(string text)
    {
        var lines = text.Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var line = RunsOfAsterisks().Replace(lines[i], "*");
            var count = line.Count(c => c == '*');
            if (count % 2 != 0)
            {
                var lastIndex = line.LastIndexOf('*');
                line = line.Remove(lastIndex, 1);
            }
            lines[i] = line;
        }
        return string.Join('\n', lines);
    }

    [GeneratedRegex(@"\*{2,}")]
    private static partial Regex RunsOfAsterisks();

    private static string ConvertTablesToLists(string text)
    {
        var lines = text.Split('\n');
        var result = new StringBuilder();
        var i = 0;

        while (i < lines.Length)
        {
            if (!LooksLikeTableRow(lines[i]) || i + 1 >= lines.Length || !TableSeparatorRow().IsMatch(lines[i + 1]))
            {
                result.Append(lines[i]).Append('\n');
                i++;
                continue;
            }

            var headers = SplitCells(lines[i]);
            i += 2; // salta encabezado y la fila separadora "---|---"

            while (i < lines.Length && LooksLikeTableRow(lines[i]))
            {
                var cells = SplitCells(lines[i]);
                result.Append("- ");
                for (var c = 0; c < cells.Count; c++)
                {
                    if (c > 0) result.Append(", ");
                    if (c < headers.Count && headers.Count > 1)
                    {
                        result.Append(headers[c]).Append(": ");
                    }
                    result.Append(cells[c]);
                }
                result.Append('\n');
                i++;
            }
        }

        return result.ToString();
    }

    private static bool LooksLikeTableRow(string line) =>
        line.Contains('|') && !TableSeparatorRow().IsMatch(line);

    private static List<string> SplitCells(string line) =>
        line.Split('|').Select(c => c.Trim()).Where(c => c.Length > 0).ToList();

    [GeneratedRegex(@"\*\*(.+?)\*\*")]
    private static partial Regex DoubleAsteriskBold();

    [GeneratedRegex(@"__(.+?)__")]
    private static partial Regex DoubleUnderscoreBold();

    [GeneratedRegex(@"^#{1,6}\s*(.+)$", RegexOptions.Multiline)]
    private static partial Regex MarkdownHeading();

    [GeneratedRegex(@"^>\s?(.*)$", RegexOptions.Multiline)]
    private static partial Regex BlockQuote();

    [GeneratedRegex(@"^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$")]
    private static partial Regex TableSeparatorRow();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex HtmlTag();

    [GeneratedRegex(@"\n{3,}")]
    private static partial Regex ExtraBlankLines();
}
