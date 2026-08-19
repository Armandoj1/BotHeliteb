using Dapper;
using Heliteb.Infrastructure.Data;

namespace Heliteb.Infrastructure.Odoo;

public record OdooLineaCotizacion(string CodigoOReferencia, int Cantidad);

public record OdooLineaResuelta(string Descripcion, decimal PrecioUnitario, decimal Subtotal);

public record OdooCotizacionResultado(
    int OrdenId, string Numero, decimal Subtotal, decimal Iva, decimal Total,
    IReadOnlyList<OdooLineaResuelta> Lineas, IReadOnlyList<string> NoResueltas);

/// <summary>
/// Crea el cliente y la cotizacion REALES en Odoo (no una aproximacion nuestra) -
/// pedido explicito de Jose: "usaras lo de Odoo para conectarte y crear el usuario
/// directamente cuando tengas los datos para hacer cotizaciones". El PDF que
/// recibe el cliente lo sigue generando QuestPdfService (Odoo no expone un
/// metodo RPC para renderizar reportes en esta version, ni acepta la credencial de
/// API para iniciar sesion web - se probaron ambos caminos), pero con el numero de
/// orden y los precios que ODOO calculo via su lista de precios, no los nuestros.
/// </summary>
public class OdooVentasService
{
    // Verificado en vivo el 2026-08-19 contra este Odoo (no cambia entre cotizaciones):
    //  - Colombia en res.country.
    private const int PaisColombiaId = 49;
    //  - "Lista de precios COP predeterminada" en product.pricelist. NUNCA la de
    //    Instalador (id 12): esa es exclusiva, segun Jose.
    private const int ListaPreciosPredeterminadaId = 1;
    //  - "Immediate Payment" en account.payment.term - es el que usan todas las
    //    ordenes reales recientes, sin distincion por tipo de cliente (Jose
    //    confirmo no complicar esto con una regla por tipo).
    private const int TerminoPagoInmediatoId = 1;
    //  - Tipos de identificacion en l10n_latam.identification.type.
    private const int TipoIdentificacionNitId = 4;
    private const int TipoIdentificacionCedulaId = 5;

    private readonly OdooXmlRpcClient _odoo;
    private readonly INpgsqlConnectionFactory _connectionFactory;

    public OdooVentasService(OdooXmlRpcClient odoo, INpgsqlConnectionFactory connectionFactory)
    {
        _odoo = odoo;
        _connectionFactory = connectionFactory;
    }

    /// <summary>
    /// Busca el contacto por identificacion (NIT/cedula) y lo crea si no existe.
    /// La ciudad se resuelve contra res.city de Odoo, tomando SIEMPRE la variante
    /// que ya tiene departamento asignado (state_id) - la misma cada vez para la
    /// misma ciudad. Nunca se deriva el departamento a mano: en este Odoo,
    /// res.country.state tiene mezclados departamentos reales con ciudades mal
    /// cargadas como si fueran departamentos, asi que resolverlo por nombre a
    /// ciegas podia mandar a alguien a la ciudad equivocada.
    /// </summary>
    public async Task<int> BuscarOCrearClienteAsync(
        string nombre, string identificacion, string telefono, string correo, string ciudad,
        CancellationToken ct = default)
    {
        var vat = LimpiarIdentificacion(identificacion);

        var existentes = await _odoo.EjecutarAsync("res.partner", "search_read",
            new object?[] { new object?[] { new object?[] { "vat", "=", vat } } },
            new Dictionary<string, object?> { ["fields"] = new object?[] { "id" }, ["limit"] = 1 }, ct);
        var encontrado = AListaDeStructs(existentes).FirstOrDefault();
        if (encontrado is not null)
        {
            return AInt(encontrado["id"]);
        }

        var (cityId, stateId, zip) = await ResolverCiudadAsync(ciudad, ct);
        var esNit = identificacion.Contains('-');

        var valores = new Dictionary<string, object?>
        {
            ["name"] = nombre,
            ["vat"] = vat,
            ["l10n_latam_identification_type_id"] = esNit ? TipoIdentificacionNitId : TipoIdentificacionCedulaId,
            ["phone"] = telefono,
            ["email"] = correo,
            ["city"] = ciudad.Trim().ToUpperInvariant(),
            ["country_id"] = PaisColombiaId,
            ["property_product_pricelist"] = ListaPreciosPredeterminadaId,
        };
        if (cityId is not null) valores["city_id"] = cityId;
        if (stateId is not null) valores["state_id"] = stateId;
        if (zip is not null) valores["zip"] = zip;

        var nuevoId = await _odoo.EjecutarAsync("res.partner", "create", new object?[] { valores }, ct: ct);
        return AInt(nuevoId);
    }

    private async Task<(int? cityId, int? stateId, string? zip)> ResolverCiudadAsync(string ciudad, CancellationToken ct)
    {
        var normalizada = ciudad.Trim().ToUpperInvariant();
        if (normalizada.Length == 0) return (null, null, null);

        var resultado = await _odoo.EjecutarAsync("res.city", "search_read",
            new object?[] { new object?[] { new object?[] { "name", "ilike", normalizada } } },
            new Dictionary<string, object?>
            {
                ["fields"] = new object?[] { "id", "name", "state_id", "zipcode" },
                ["limit"] = 30,
            }, ct);

        var candidatos = AListaDeStructs(resultado)
            .Where(c => (c["name"]?.ToString() ?? "").Trim().ToUpperInvariant().StartsWith(normalizada, StringComparison.Ordinal))
            .OrderBy(c => AInt(c["id"]))
            .ToList();

        // Siempre la misma para la misma ciudad: primero la que ya tiene
        // departamento, y si ninguna lo tiene, la primera en orden estable.
        var elegido = candidatos.FirstOrDefault(c => c["state_id"] is IList<object?>) ?? candidatos.FirstOrDefault();
        if (elegido is null) return (null, null, null);

        var cityId = AInt(elegido["id"]);
        int? stateId = elegido["state_id"] is IList<object?> arr && arr.Count > 0 ? AInt(arr[0]) : null;
        var zip = elegido.TryGetValue("zipcode", out var z) ? z?.ToString() : null;
        return (cityId, stateId, zip);
    }

    /// <summary>
    /// Crea la orden en Odoo con la lista de precios predeterminada: los precios y
    /// el total los calcula Odoo, no nosotros - por eso se relee la orden despues
    /// de crearla en vez de sumar nada aqui.
    /// </summary>
    public async Task<OdooCotizacionResultado> CrearCotizacionAsync(
        int partnerId, IReadOnlyList<OdooLineaCotizacion> lineas, CancellationToken ct = default)
    {
        var lineasOrden = new List<object?>();
        var noResueltas = new List<string>();
        foreach (var linea in lineas)
        {
            var varianteId = await ResolverVarianteOdooAsync(linea.CodigoOReferencia, ct);
            if (varianteId is null)
            {
                noResueltas.Add(linea.CodigoOReferencia);
                continue;
            }
            lineasOrden.Add(new object?[]
            {
                0, 0, new Dictionary<string, object?>
                {
                    ["product_id"] = varianteId.Value,
                    ["product_uom_qty"] = linea.Cantidad,
                },
            });
        }

        if (lineasOrden.Count == 0)
        {
            throw new InvalidOperationException(
                "Ninguna referencia se pudo resolver en Odoo: " + string.Join(", ", noResueltas));
        }

        var valoresOrden = new Dictionary<string, object?>
        {
            ["partner_id"] = partnerId,
            ["pricelist_id"] = ListaPreciosPredeterminadaId,
            ["payment_term_id"] = TerminoPagoInmediatoId,
            ["order_line"] = lineasOrden,
        };
        var ordenId = AInt(await _odoo.EjecutarAsync("sale.order", "create", new object?[] { valoresOrden }, ct: ct));

        var leida = AListaDeStructs(await _odoo.EjecutarAsync("sale.order", "read",
            new object?[] { new object?[] { ordenId } },
            new Dictionary<string, object?>
            {
                ["fields"] = new object?[] { "name", "amount_untaxed", "amount_tax", "amount_total", "order_line" },
            }, ct)).First();

        var idsLinea = (leida["order_line"] as IList<object?> ?? new List<object?>()).Select(AInt).ToArray();
        var lineasLeidas = AListaDeStructs(await _odoo.EjecutarAsync("sale.order.line", "read",
            new object?[] { idsLinea },
            new Dictionary<string, object?> { ["fields"] = new object?[] { "name", "price_unit", "price_subtotal" } }, ct));

        var lineasResueltas = lineasLeidas
            .Select(l => new OdooLineaResuelta(
                l["name"]?.ToString() ?? "",
                (decimal)AConDouble(l["price_unit"]),
                (decimal)AConDouble(l["price_subtotal"])))
            .ToList();

        return new OdooCotizacionResultado(
            ordenId,
            leida["name"]?.ToString() ?? ("Odoo-" + ordenId),
            (decimal)AConDouble(leida["amount_untaxed"]),
            (decimal)AConDouble(leida["amount_tax"]),
            (decimal)AConDouble(leida["amount_total"]),
            lineasResueltas,
            noResueltas);
    }

    /// <summary>
    /// Resuelve codigo SAP o modelo/referencia al product.product real de Odoo,
    /// via el cruce que ya arma el ETL (producto_stock + stock_items.odoo_tmpl_id).
    /// El modelo real en catalogo casi siempre trae sufijos pegados (lente, region,
    /// hasta caracteres en chino: "CS-H8c-R200-1K3WKFL(4mm)(AM-STD)(Mul)") que el
    /// agente nunca repite tal cual - por eso se compara normalizado y con
    /// contains, no con igualdad exacta. Mismo bug, mismo arreglo que ya se aplico
    /// hoy en CotizacionService al generar el PDF propio.
    /// </summary>
    private async Task<int?> ResolverVarianteOdooAsync(string codigoOReferencia, CancellationToken ct)
    {
        using var conn = _connectionFactory.Create();

        var tmplId = await BuscarTmplIdPorSapAsync(conn, codigoOReferencia);

        if (tmplId is null)
        {
            var normalizado = NormalizarModelo(codigoOReferencia);
            if (normalizado.Length > 0)
            {
                var candidatos = await conn.QueryAsync<(string CodigoSap, string Modelo)>("""
                    SELECT ps.codigo_sap AS "CodigoSap", p.modelo AS "Modelo"
                    FROM producto_stock ps
                    JOIN productos p ON p.codigo_sap = ps.codigo_sap
                    """);
                var elegido = candidatos.FirstOrDefault(c => NormalizarModelo(c.Modelo).Contains(normalizado));
                if (elegido.CodigoSap is not null)
                {
                    tmplId = await BuscarTmplIdPorSapAsync(conn, elegido.CodigoSap);
                }
            }
        }

        if (tmplId is null) return null;

        var variantes = AListaDeStructs(await _odoo.EjecutarAsync("product.product", "search_read",
            new object?[] { new object?[] { new object?[] { "product_tmpl_id", "=", tmplId.Value } } },
            new Dictionary<string, object?> { ["fields"] = new object?[] { "id" }, ["limit"] = 1 }, ct));
        return variantes.Count == 0 ? null : AInt(variantes[0]["id"]);
    }

    private static Task<int?> BuscarTmplIdPorSapAsync(System.Data.IDbConnection conn, string codigoSap) =>
        conn.QueryFirstOrDefaultAsync<int?>("""
            SELECT si.odoo_tmpl_id
            FROM producto_stock ps
            JOIN stock_items si ON si.sku = ps.sku
            WHERE ps.codigo_sap = @CodigoSap
            LIMIT 1
            """, new { CodigoSap = codigoSap });

    // Deja solo letras y numeros, sin parentesis ni su contenido - mismo criterio
    // que CotizacionService.NormalizarModelo.
    private static string NormalizarModelo(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor)) return string.Empty;
        var sinParentesis = System.Text.RegularExpressions.Regex.Replace(valor, @"\([^)]*\)", " ");
        return System.Text.RegularExpressions.Regex.Replace(sinParentesis, @"[^A-Za-z0-9]", "").ToUpperInvariant();
    }

    private static string LimpiarIdentificacion(string identificacion) =>
        new string(identificacion.Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray()).Trim();

    // --------------------------------------------------------------- helpers de tipos

    private static List<IDictionary<string, object?>> AListaDeStructs(object? valor) =>
        (valor as IEnumerable<object?> ?? Enumerable.Empty<object?>())
        .Select(v => v as IDictionary<string, object?>)
        .Where(v => v is not null)
        .Select(v => v!)
        .ToList();

    private static int AInt(object? valor) => valor switch
    {
        null => 0,
        int i => i,
        long l => (int)l,
        double d => (int)d,
        bool => 0, // Odoo manda "false" (bool) en vez de un many2one vacio.
        _ => Convert.ToInt32(valor),
    };

    private static double AConDouble(object? valor) => valor switch
    {
        null => 0,
        double d => d,
        long l => l,
        int i => i,
        bool => 0,
        _ => Convert.ToDouble(valor),
    };
}
