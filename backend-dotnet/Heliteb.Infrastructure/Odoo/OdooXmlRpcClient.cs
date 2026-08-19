using System.Globalization;
using System.Text;
using System.Xml.Linq;

namespace Heliteb.Infrastructure.Odoo;

/// <summary>
/// Cliente XML-RPC minimo hecho a mano para hablar con Odoo (xmlrpc/2/common y
/// xmlrpc/2/object) - .NET no trae soporte nativo para XML-RPC y esta es la
/// primera vez que el backend habla con Odoo directamente (antes solo lo hacia
/// el ETL en Python via cargar_catalogo.py). Cubre solo lo que se necesita:
/// authenticate y execute_kw, con los tipos de valor que Odoo realmente manda
/// (string, int, double, bool, array, struct, nil).
/// </summary>
public class OdooXmlRpcClient
{
    private readonly HttpClient _http;
    private readonly OdooOptions _options;
    private int? _uid;

    public OdooXmlRpcClient(HttpClient http, OdooOptions options)
    {
        _http = http;
        _options = options;
    }

    private async Task<int> ObtenerUidAsync(CancellationToken ct)
    {
        if (_uid.HasValue) return _uid.Value;

        var resultado = await LlamarAsync(
            _options.Url.TrimEnd('/') + "/xmlrpc/2/common",
            "authenticate",
            new object?[] { _options.Db, _options.User, _options.Password, new Dictionary<string, object?>() },
            ct);

        // Los enteros de la respuesta XML-RPC llegan como long (ver ParsearValor);
        // comparar contra "int" aqui siempre daba falso y hacia ver como rechazado
        // un login que en realidad funcionaba.
        var uid = resultado switch
        {
            long l => (int)l,
            int i => i,
            _ => 0,
        };
        if (uid <= 0)
        {
            throw new InvalidOperationException("Odoo rechazo la autenticacion (authenticate devolvio false/0).");
        }
        _uid = uid;
        return uid;
    }

    /// <summary>Equivalente a models.execute_kw(db, uid, password, modelo, metodo, args, kwargs).</summary>
    public async Task<object?> EjecutarAsync(
        string modelo, string metodo, object?[] args, Dictionary<string, object?>? kwargs = null, CancellationToken ct = default)
    {
        var uid = await ObtenerUidAsync(ct);
        var parametros = new List<object?> { _options.Db, uid, _options.Password, modelo, metodo, args };
        if (kwargs is { Count: > 0 })
        {
            parametros.Add(kwargs);
        }

        return await LlamarAsync(_options.Url.TrimEnd('/') + "/xmlrpc/2/object", "execute_kw", parametros.ToArray(), ct);
    }

    private async Task<object?> LlamarAsync(string endpoint, string metodo, object?[] parametros, CancellationToken ct)
    {
        var xmlPedido = ConstruirPedido(metodo, parametros);
        using var contenido = new StringContent(xmlPedido, Encoding.UTF8, "text/xml");
        using var respuesta = await _http.PostAsync(endpoint, contenido, ct);
        respuesta.EnsureSuccessStatusCode();
        var cuerpo = await respuesta.Content.ReadAsStringAsync(ct);
        return ParsearRespuesta(cuerpo);
    }

    // ------------------------------------------------------------------ serializar

    private static string ConstruirPedido(string metodo, object?[] parametros)
    {
        var sb = new StringBuilder();
        sb.Append("<?xml version=\"1.0\"?><methodCall><methodName>")
          .Append(Escapar(metodo))
          .Append("</methodName><params>");
        foreach (var p in parametros)
        {
            sb.Append("<param><value>");
            SerializarValor(p, sb);
            sb.Append("</value></param>");
        }
        sb.Append("</params></methodCall>");
        return sb.ToString();
    }

    private static void SerializarValor(object? valor, StringBuilder sb)
    {
        switch (valor)
        {
            case null:
                sb.Append("<nil/>");
                break;
            case bool b:
                sb.Append("<boolean>").Append(b ? '1' : '0').Append("</boolean>");
                break;
            case int or long or short:
                sb.Append("<int>").Append(Convert.ToInt64(valor, CultureInfo.InvariantCulture)).Append("</int>");
                break;
            case float or double or decimal:
                sb.Append("<double>").Append(Convert.ToDouble(valor, CultureInfo.InvariantCulture)
                    .ToString("R", CultureInfo.InvariantCulture)).Append("</double>");
                break;
            case string s:
                sb.Append("<string>").Append(Escapar(s)).Append("</string>");
                break;
            case IDictionary<string, object?> dict:
                sb.Append("<struct>");
                foreach (var (clave, val) in dict)
                {
                    sb.Append("<member><name>").Append(Escapar(clave)).Append("</name><value>");
                    SerializarValor(val, sb);
                    sb.Append("</value></member>");
                }
                sb.Append("</struct>");
                break;
            case System.Collections.IEnumerable enumerable:
                sb.Append("<array><data>");
                foreach (var item in enumerable)
                {
                    sb.Append("<value>");
                    SerializarValor(item, sb);
                    sb.Append("</value>");
                }
                sb.Append("</data></array>");
                break;
            default:
                throw new NotSupportedException("Tipo no soportado en XML-RPC: " + valor.GetType());
        }
    }

    private static string Escapar(string texto) =>
        texto.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    // ------------------------------------------------------------------ deserializar

    private static object? ParsearRespuesta(string xml)
    {
        var doc = XDocument.Parse(xml);
        var raiz = doc.Root ?? throw new InvalidOperationException("Respuesta XML-RPC vacia.");

        var fault = raiz.Element("fault");
        if (fault is not null)
        {
            var valorFault = fault.Element("value");
            var datos = valorFault is not null ? ParsearValor(valorFault) as IDictionary<string, object?> : null;
            var mensaje = datos is not null && datos.TryGetValue("faultString", out var fs) ? fs?.ToString() : "error XML-RPC sin detalle";
            throw new InvalidOperationException("Odoo devolvio un fault: " + mensaje);
        }

        var valorParam = raiz.Element("params")?.Element("param")?.Element("value");
        return valorParam is null ? null : ParsearValor(valorParam);
    }

    private static object? ParsearValor(XElement valorEl)
    {
        var hijo = valorEl.Elements().FirstOrDefault();
        if (hijo is null)
        {
            // <value>texto plano</value> sin tag interno: XML-RPC lo trata como string.
            return valorEl.Value;
        }

        return hijo.Name.LocalName switch
        {
            "string" => hijo.Value,
            "int" or "i4" => long.Parse(hijo.Value, CultureInfo.InvariantCulture),
            "double" => double.Parse(hijo.Value, CultureInfo.InvariantCulture),
            "boolean" => hijo.Value.Trim() is "1" or "true",
            "nil" => null,
            "array" => (hijo.Element("data")?.Elements("value") ?? Enumerable.Empty<XElement>())
                .Select(ParsearValor).ToList(),
            "struct" => (IDictionary<string, object?>)hijo.Elements("member").ToDictionary(
                m => m.Element("name")?.Value ?? "",
                m => m.Element("value") is { } v ? ParsearValor(v) : null),
            _ => hijo.Value,
        };
    }
}
