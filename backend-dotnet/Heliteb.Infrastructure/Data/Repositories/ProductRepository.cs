using Dapper;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Catalog;
using Heliteb.Application.Catalog.Dtos;
using Heliteb.Infrastructure.Data;

namespace Heliteb.Infrastructure.Data.Repositories;

public class ProductRepository : IProductQueries
{
    private const string CloudinaryImageBase = "https://res.cloudinary.com/dejnhu8vx/image/upload/heliteb/";

    private static readonly HashSet<string> StopwordsAccesorio = new()
    {
        "de", "la", "el", "los", "las", "una", "uno", "unos", "unas", "para", "con",
        "que", "del", "en", "y", "o", "un", "al", "por", "es", "esa", "ese", "esta", "este",
    };

    private readonly INpgsqlConnectionFactory _connectionFactory;
    private readonly IEmbeddingClient _embeddingClient;

    public ProductRepository(INpgsqlConnectionFactory connectionFactory, IEmbeddingClient embeddingClient)
    {
        _connectionFactory = connectionFactory;
        _embeddingClient = embeddingClient;
    }

    public async Task<IReadOnlyList<ProductoDto>> GetAllAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT vc.codigo_sap AS "CodigoSap", vc.marca AS "Marca", vc.categoria AS "Categoria",
                   vc.linea AS "Linea", vc.serie AS "Serie", vc.sub_serie AS "SubSerie", vc.modelo AS "Modelo",
                   vc.parametro_1 AS "Parametro1", vc.parametro_2 AS "Parametro2", vc.parametro_3 AS "Parametro3",
                   vc.descripcion AS "Descripcion", vc.modelo_etiqueta AS "ModeloEtiqueta",
                   vc.precio_msrp_cop AS "PrecioMsrpCop",
                   (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = vc.codigo_sap) AS "StockTotal"
            FROM vista_catalogo vc
            ORDER BY marca, categoria, modelo
            """;

        const string stockSql = """
            SELECT codigo_sap AS "CodigoSap", marca AS "Marca", modelo AS "Modelo",
                   codigo_bodega AS "CodigoBodega", nombre_sucursal AS "NombreSucursal", ciudad AS "Ciudad",
                   cantidad_disponible AS "CantidadDisponible", precio_msrp_cop AS "PrecioMsrpCop"
            FROM vista_stock
            """;

        using var conn = _connectionFactory.Create();
        var rows = (await conn.QueryAsync<ProductoDto>(sql)).AsList();
        // Una sola consulta extra para todo el catalogo (no una por producto) - se agrupa
        // en memoria por codigo_sap para que el panel pueda mostrar el desglose por
        // bodega sin que el listado general (miles de productos) haga N+1 queries.
        var stockPorProducto = (await conn.QueryAsync<StockDto>(stockSql))
            .AsList()
            .GroupBy(s => s.CodigoSap)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var p in rows)
        {
            p.ImagenUrl = CloudinaryImageBase + p.CodigoSap;
            if (stockPorProducto.TryGetValue(p.CodigoSap, out var stock))
            {
                p.StockBodegas = stock;
            }
        }
        return rows;
    }

    private static readonly System.Text.RegularExpressions.Regex CodeLikeToken =
        new(@"^[A-Za-z0-9][A-Za-z0-9\-\./]{4,}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static bool LooksLikeProductCode(string token) =>
        CodeLikeToken.IsMatch(token) && token.Any(char.IsDigit) && token.Any(char.IsLetter);

    public async Task<IReadOnlyList<ProductoDto>> BuscarProductosAsync(string query, ProductoFiltros? filtros = null, int limit = 10, CancellationToken ct = default)
    {
        // Si el usuario menciona un código/modelo concreto (ej. "DS-2CD1143G2-LIU" o un
        // código SAP), la coincidencia exacta es más confiable que la semántica para
        // alfanuméricos — se resuelve primero por ese camino.
        var rawTokens = query.Split(' ', ',', ';').Select(t => t.Trim()).Where(t => t.Length > 0);
        var codeTokens = rawTokens.Where(LooksLikeProductCode).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

        if (codeTokens.Length > 0)
        {
            var exactMatches = await BuscarPorCodigoExactoAsync(codeTokens, limit, ct);
            if (exactMatches.Count > 0)
            {
                return exactMatches;
            }
        }

        // Filtros estructurados extraídos por el LLM (tipo de producto, canales,
        // resolución, orden por precio): se resuelven como SQL exacto, que es lo que la
        // semántica pura no sabe hacer con criterios numéricos. Si el filtro exacto no
        // encuentra nada, se cae a la semántica para que el agente igual tenga contexto
        // que ofrecer como alternativa.
        if (filtros?.TieneFiltrosEstructurados == true)
        {
            var filtrados = await BuscarConFiltrosAsync(query, filtros, limit, ct);
            if (filtrados.Count > 0)
            {
                return filtrados;
            }
        }

        // Para lenguaje natural se usa búsqueda semántica (embeddings bge-m3): el
        // catálogo mezcla descripciones en inglés (HIKVISION) y español (EZVIZ), y una
        // consulta en español como "domo interior lente fijo" no cruza por palabras
        // clave con "indoor dome camera" — pero sí queda cerca en el espacio vectorial.
        return await BuscarSemanticamenteAsync(query, limit, ct);
    }

    // Mapeo de tipo_producto a las categorías/líneas REALES del catálogo (verificadas
    // contra la BD, no supuestas): 'DVR' y 'Network Video Recorders' son valores exactos
    // de p.linea; las cámaras viven repartidas entre 'Cameras Products' (HIKVISION),
    // categorías EZVIZ tipo 'Camaras Wi Fi...' y líneas como 'Traffic Cameras'.
    private async Task<IReadOnlyList<ProductoDto>> BuscarConFiltrosAsync(string query, ProductoFiltros filtros, int limit, CancellationToken ct)
    {
        var where = new List<string> { "p.activo = TRUE" };
        var param = new Dapper.DynamicParameters();
        param.Add("Limit", limit);

        switch (filtros.TipoProducto?.ToLowerInvariant())
        {
            case "dvr": where.Add("p.linea = 'DVR'"); break;
            case "nvr": where.Add("p.linea = 'Network Video Recorders'"); break;
            case "camara": where.Add("(c.nombre ILIKE '%camera%' OR c.nombre ILIKE '%camara%' OR p.linea ILIKE '%camera%')"); break;
            case "switch": where.Add("p.linea = 'Switches'"); break;
            case "disco_duro": where.Add("(c.nombre = 'HDD' OR p.linea = 'HDD')"); break;
            // Cobertura amplia a proposito: el catalogo tiene accesorios repartidos en
            // 12 categorias distintas (CCTV, video intercom, redes, tarjetas de
            // almacenamiento en "Onboard Security", etc.) y algunas descripciones no son
            // ni siquiera en espanol/ingles - un filtro SQL exacto por "accessor" en
            // categoria/linea encuentra estos productos aunque la busqueda semantica
            // (embeddings) no los relacione bien con el texto libre del cliente.
            case "accesorio": where.Add("(c.nombre ILIKE '%accessor%' OR p.linea ILIKE '%accessor%')"); break;
        }

        // Sin este filtro, tecnologia=null deja pasar cualquier conexion: con
        // OrdenarPor=precio_asc ("economica") eso hace que una camara analoga (mas
        // barata en general) le gane a una WiFi aunque el cliente haya pedido
        // explicitamente inalambrica - el precio no puede pisar un criterio de conexion
        // que el cliente si menciono.
        switch (filtros.Tecnologia?.ToLowerInvariant())
        {
            // El catalogo mezcla "Wifi" y "Wi Fi" (con espacio) segun la linea EZVIZ -
            // se quita el espacio antes de comparar para no perder ninguna de las dos.
            case "wifi": where.Add("regexp_replace(c.nombre, '\\s', '', 'g') ILIKE '%wifi%'"); break;
            case "ip": where.Add("p.linea = 'Network Cameras'"); break;
            case "analoga": where.Add("p.linea IN ('Turbo HD Camera', 'Turbo HD Cameras', 'Turbo HD PTZ')"); break;
        }

        // "accesorio" por si solo acota a ~400 candidatos repartidos en 12 categorias -
        // demasiados para que el ranking semantico (mas abajo) elija bien entre ellos,
        // sobre todo porque algunas descripciones estan en ingles/chino y el embedding
        // no las relaciona con el texto del cliente. Coincidencia literal de palabras
        // es mas confiable aqui que la cercania semantica.
        if (filtros.TipoProducto?.ToLowerInvariant() == "accesorio" && !string.IsNullOrWhiteSpace(query))
        {
            // Filtra rellenos comunes en vez de cortar por longitud: siglas tecnicas
            // cortas como "SD", "4K", "IR", "PoE" suelen ser justo la palabra que hace
            // match real en el modelo/descripcion (ej. "AE-DF5SD128G-M2").
            var palabras = query.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(p => !StopwordsAccesorio.Contains(p.ToLowerInvariant()))
                .ToArray();
            if (palabras.Length > 0)
            {
                var clausulas = new List<string>();
                for (var i = 0; i < palabras.Length; i++)
                {
                    param.Add($"Palabra{i}", $"%{palabras[i]}%");
                    clausulas.Add($"(p.modelo ILIKE @Palabra{i} OR p.descripcion ILIKE @Palabra{i} OR c.nombre ILIKE @Palabra{i})");
                }
                where.Add($"({string.Join(" OR ", clausulas)})");
            }
        }

        if (filtros.Canales is int canales)
        {
            where.Add("p.parametro_1 = @Canales");
            param.Add("Canales", canales.ToString());
        }

        if (filtros.ResolucionMp is int mp)
        {
            // parametro_2 es el campo confiable en HIKVISION; EZVIZ lo trae null y la
            // resolución vive en la descripción — se revisan ambos. El regex evita que
            // "4 MP" haga match con "24 MP".
            where.Add("(p.parametro_2 ~* @MpRegex OR p.descripcion ~* @MpRegex)");
            param.Add("MpRegex", $@"(^|[^0-9]){mp}\s*MP");
        }

        string orden;
        if (filtros.OrdenarPor == "precio_desc")
        {
            orden = "pr.precio_msrp_cop DESC NULLS LAST";
        }
        else if (filtros.OrdenarPor == "precio_asc")
        {
            orden = "pr.precio_msrp_cop ASC NULLS LAST";
        }
        else if (!string.IsNullOrWhiteSpace(query))
        {
            // Sin orden explícito, dentro del conjunto filtrado se ordena por cercanía
            // semántica al texto libre (uso, ambiente, características descriptivas).
            var emb = await _embeddingClient.EmbedAsync(query, ct);
            param.Add("QueryVector", PgVectorFormat.ToLiteral(emb));
            where.Add("p.embedding IS NOT NULL");
            orden = "p.embedding <=> @QueryVector::vector";
        }
        else
        {
            orden = "pr.precio_msrp_cop ASC NULLS LAST";
        }

        var sql = $"""
            SELECT p.codigo_sap AS "CodigoSap", m.nombre AS "Marca", c.nombre AS "Categoria",
                   p.linea AS "Linea", p.serie AS "Serie", p.sub_serie AS "SubSerie", p.modelo AS "Modelo",
                   p.parametro_1 AS "Parametro1", p.parametro_2 AS "Parametro2", p.parametro_3 AS "Parametro3",
                   p.descripcion AS "Descripcion", p.modelo_etiqueta AS "ModeloEtiqueta",
                   pr.precio_msrp_cop AS "PrecioMsrpCop",
                   (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = p.codigo_sap) AS "StockTotal"
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id_marca
            JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN precios pr ON pr.codigo_sap = p.codigo_sap
            WHERE {string.Join(" AND ", where)}
            ORDER BY (SELECT COALESCE(SUM(i2.cantidad_disponible), 0) FROM inventario i2 WHERE i2.codigo_sap = p.codigo_sap) > 0 DESC,
                     {orden}
            LIMIT @Limit
            """;

        using var conn = _connectionFactory.Create();
        var rows = (await conn.QueryAsync<ProductoDto>(sql, param)).AsList();
        foreach (var p in rows)
        {
            p.ImagenUrl = CloudinaryImageBase + p.CodigoSap;
        }
        return rows;
    }

    private async Task<IReadOnlyList<ProductoDto>> BuscarPorCodigoExactoAsync(
        IReadOnlyList<string> codeTokens, int limit, CancellationToken ct)
    {
        const string sql = """
            SELECT codigo_sap AS "CodigoSap", marca AS "Marca", categoria AS "Categoria",
                   linea AS "Linea", serie AS "Serie", sub_serie AS "SubSerie", modelo AS "Modelo",
                   parametro_1 AS "Parametro1", parametro_2 AS "Parametro2", parametro_3 AS "Parametro3",
                   descripcion AS "Descripcion", modelo_etiqueta AS "ModeloEtiqueta",
                   precio_msrp_cop AS "PrecioMsrpCop",
                   (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = vista_catalogo.codigo_sap) AS "StockTotal"
            FROM vista_catalogo
            WHERE EXISTS (SELECT 1 FROM unnest(@CodeTokens) AS t WHERE modelo ILIKE '%' || t || '%' OR codigo_sap ILIKE '%' || t || '%')
            ORDER BY marca, modelo
            LIMIT @Limit
            """;

        using var conn = _connectionFactory.Create();
        var rows = (await conn.QueryAsync<ProductoDto>(sql, new { CodeTokens = codeTokens, Limit = limit })).AsList();
        foreach (var p in rows)
        {
            p.ImagenUrl = CloudinaryImageBase + p.CodigoSap;
        }
        return rows;
    }

    // "IP" es ambiguo en las fichas del catálogo: puede significar "cámara IP de red"
    // o simplemente el grado de protección "IP67" (agua/polvo) — la ficha de una cámara
    // de red típica ni siquiera dice "network"/"IP camera" en el texto, así que el
    // embedding no distingue bien esta intención. El código de modelo Hikvision sí es
    // confiable: DS-2CD/iDS-2C/DS-2DE/DS-2DF son series de cámaras IP de red; DS-2CE es
    // Turbo HD analógica. Cuando el usuario pide explícitamente "IP"/"red"/"PoE", se
    // complementa la búsqueda semántica con esas series aunque no ganen por embedding.
    private static readonly System.Text.RegularExpressions.Regex WantsNetworkCamera =
        new(@"\b(ip|poe|red)\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

    // El campo parametro_1 sí trae un vocabulario limpio y confiable para el TIPO de
    // cámara (Bullet, Dome, Turret, PTZ...), a diferencia de la descripcion libre. En
    // vez de confiar solo en que el embedding entienda "bala"/"domo"/"turret", se hace
    // un refuerzo determinístico igual que con las cámaras de red — evita que una
    // cámara PT salga como "la única con stock" cuando en realidad hay balas/domos
    // reales con mucho más stock que el embedding no priorizó.
    private static readonly Dictionary<string, string> TipoCamaraPattern = new(StringComparer.OrdinalIgnoreCase)
    {
        ["domo"] = "%dome%",
        ["dome"] = "%dome%",
        ["bala"] = "%bullet%",
        ["bullet"] = "%bullet%",
        ["turret"] = "%turret%",
    };

    private static string? DetectarTipoCamara(string query)
    {
        foreach (var (palabra, patron) in TipoCamaraPattern)
        {
            if (System.Text.RegularExpressions.Regex.IsMatch(query, $@"\b{palabra}\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            {
                return patron;
            }
        }
        return null;
    }

    // El alcance IR en metros no existe como campo estructurado - solo vive como texto
    // libre en descripcion ("80 m IR distance", "IR 30m ..."). El embedding no entiende
    // umbrales numericos ("mayor a 50 metros"): la MISMA camara con 80m de alcance real
    // puede quedar en la posicion 2 o en la posicion 8 del ranking por marca segun como
    // el LLM redacte la busqueda, y el pool solo toma el top-5 por marca - por eso a
    // veces "desaparecia" una camara que si cumple el criterio. Se extrae el numero real
    // por regex y se filtra por umbral exacto, igual que el refuerzo de tipo de camara.
    private static readonly System.Text.RegularExpressions.Regex WantsIrDistance =
        new(@"\bIR\b[\s\S]{0,30}?(\d{2,4})\s*(?:m\b|metros)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

    private static int? DetectarUmbralIrMetros(string query)
    {
        var match = WantsIrDistance.Match(query);
        return match.Success && int.TryParse(match.Groups[1].Value, out var metros) ? metros : null;
    }

    // La cantidad de canales de un DVR/NVR SI es un campo estructurado (parametro_1),
    // pero el embedding no lo trata como un filtro exacto: para "DVR economico de 4
    // canales" el ranking semantico puede devolver grabadores de 8, 16 o 32 canales (o
    // hasta un NVR de $15M) antes que las opciones de 4 canales reales con stock, porque
    // "economico" tampoco es una señal textual que el embedding entienda como "ordenar
    // por precio ascendente". Cuando se detecta un numero de canales pedido junto a
    // DVR/NVR/grabador, se filtra por coincidencia EXACTA de canales y se ordena por
    // precio ascendente - así las opciones baratas quedan primero en vez de perderse.
    private static readonly System.Text.RegularExpressions.Regex WantsCanalesGrabador =
        new(@"\b(\d{1,2})\s*(?:canales?|ch\b)[\s\S]{0,40}?\b(dvr|nvr|grabador)\b|\b(dvr|nvr|grabador)\b[\s\S]{0,40}?\b(\d{1,2})\s*(?:canales?|ch\b)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

    private static int? DetectarCanalesGrabador(string query)
    {
        var match = WantsCanalesGrabador.Match(query);
        if (!match.Success) return null;
        var grupo = match.Groups[1].Success ? match.Groups[1] : match.Groups[4];
        return int.TryParse(grupo.Value, out var canales) ? canales : null;
    }

    private async Task<IReadOnlyList<ProductoDto>> BuscarSemanticamenteAsync(string query, int limit, CancellationToken ct)
    {
        var queryEmbedding = await _embeddingClient.EmbedAsync(query, ct);
        var queryVector = PgVectorFormat.ToLiteral(queryEmbedding);

        var wantsRed = WantsNetworkCamera.IsMatch(query);
        var patronTipo = DetectarTipoCamara(query);
        var umbralIr = DetectarUmbralIrMetros(query);
        var canalesGrabador = DetectarCanalesGrabador(query);

        // Las consultas usan cada una su propia conexión y no dependen entre sí
        // (todas parten del mismo queryVector ya calculado), así que se disparan en
        // paralelo en vez de una tras otra.
        var baseTask = BuscarSemanticaBaseAsync(queryVector, limit, ct);
        var redTask = wantsRed
            ? BuscarCamarasDeRedAsync(queryVector, limit, ct)
            : Task.FromResult<IReadOnlyList<ProductoDto>>(Array.Empty<ProductoDto>());
        var tipoTask = patronTipo is not null
            ? BuscarPorTipoDeCamaraAsync(patronTipo, queryVector, limit, ct)
            : Task.FromResult<IReadOnlyList<ProductoDto>>(Array.Empty<ProductoDto>());
        var irTask = umbralIr is not null
            ? BuscarPorAlcanceIrAsync(umbralIr.Value, queryVector, limit, ct)
            : Task.FromResult<IReadOnlyList<ProductoDto>>(Array.Empty<ProductoDto>());
        var canalesTask = canalesGrabador is not null
            ? BuscarPorCanalesGrabadorAsync(canalesGrabador.Value, queryVector, limit, ct)
            : Task.FromResult<IReadOnlyList<ProductoDto>>(Array.Empty<ProductoDto>());

        await Task.WhenAll(baseTask, redTask, tipoTask, irTask, canalesTask);
        var rows = baseTask.Result.ToList();

        if (wantsRed)
        {
            // Complementa el pool diverso con cámaras de red genuinas — sin este tope,
            // esta lista podía llenar el cupo completo ella sola y tapar por completo
            // otras marcas (EZVIZ nunca usa estos prefijos de modelo, así que quedaría
            // en cero) cada vez que la consulta del LLM incluyera la palabra "IP".
            var camarasDeRed = redTask.Result.Take(Math.Max(limit / 2, 2)).ToList();
            rows = camarasDeRed
                .Concat(rows.Where(r => camarasDeRed.All(c => c.CodigoSap != r.CodigoSap)))
                .Take(limit)
                .ToList();
        }

        if (patronTipo is not null)
        {
            var porTipo = tipoTask.Result.Take(Math.Max(limit / 2, 2)).ToList();
            rows = porTipo
                .Concat(rows.Where(r => porTipo.All(t => t.CodigoSap != r.CodigoSap)))
                .Take(limit)
                .ToList();
        }

        if (umbralIr is not null)
        {
            // Igual que los otros refuerzos: complementa sin reemplazar el pool diverso,
            // para que un umbral de metros no termine tapando otras marcas/tipos.
            var porAlcanceIr = irTask.Result.Take(Math.Max(limit / 2, 2)).ToList();
            rows = porAlcanceIr
                .Concat(rows.Where(r => porAlcanceIr.All(t => t.CodigoSap != r.CodigoSap)))
                .Take(limit)
                .ToList();
        }

        if (canalesGrabador is not null && canalesTask.Result.Count > 0)
        {
            // A diferencia de los otros refuerzos, este SI va primero: ya viene ordenado
            // por precio ascendente y filtrado por la cantidad exacta de canales pedida,
            // así que es la respuesta más relevante posible - no debe competir por espacio
            // con resultados semánticos genéricos que ni siquiera cumplen el criterio.
            var porCanales = canalesTask.Result.Take(limit).ToList();
            rows = porCanales
                .Concat(rows.Where(r => porCanales.All(c => c.CodigoSap != r.CodigoSap)))
                .Take(limit)
                .ToList();
        }

        foreach (var p in rows)
        {
            p.ImagenUrl = CloudinaryImageBase + p.CodigoSap;
        }
        return rows;
    }

    // Dos ajustes sobre la similitud semántica pura:
    // 1. No entiende "stock" ni "económico" (son señales numéricas, no textuales) —
    //    sin esto, un accesorio sin stock de $4M puede salir antes que una cámara
    //    barata y disponible solo porque el texto es "parecido".
    // 2. EZVIZ redacta en tono de marketing conversacional ("CAMARA WIFI INTELIGENTE
    //    EXTERIOR") que se parece más a como pregunta un cliente que las fichas
    //    técnicas de HIKVISION ("High quality imaging with 2MP resolution") — aunque
    //    ambas ya están en el mismo idioma, ese registro de escritura sesga el
    //    ranking hacia una sola marca. Se limita cuántos resultados puede aportar
    //    cada marca al pool de candidatos, para que el resto del catálogo (97% del
    //    total) tenga oportunidad real de competir en vez de quedar tapado.
    private async Task<IReadOnlyList<ProductoDto>> BuscarSemanticaBaseAsync(string queryVector, int limit, CancellationToken ct)
    {
        const string sql = """
            WITH ranqueado AS (
                SELECT p.codigo_sap, m.nombre AS marca, c.nombre AS categoria,
                       p.linea, p.serie, p.sub_serie, p.modelo,
                       p.parametro_1, p.parametro_2, p.parametro_3,
                       p.descripcion, p.modelo_etiqueta, pr.precio_msrp_cop,
                       (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = p.codigo_sap) AS stock_total,
                       p.embedding <=> @QueryVector::vector AS distancia,
                       ROW_NUMBER() OVER (PARTITION BY m.nombre ORDER BY p.embedding <=> @QueryVector::vector) AS puesto_en_marca
                FROM productos p
                JOIN marcas m ON p.id_marca = m.id_marca
                JOIN categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN precios pr ON pr.codigo_sap = p.codigo_sap
                WHERE p.activo = TRUE AND p.embedding IS NOT NULL
            ),
            candidatos AS (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY marca ORDER BY (stock_total > 0) DESC, distancia) AS puesto_final_en_marca
                FROM ranqueado WHERE puesto_en_marca <= @PorMarca
            )
            SELECT codigo_sap AS "CodigoSap", marca AS "Marca", categoria AS "Categoria",
                   linea AS "Linea", serie AS "Serie", sub_serie AS "SubSerie", modelo AS "Modelo",
                   parametro_1 AS "Parametro1", parametro_2 AS "Parametro2", parametro_3 AS "Parametro3",
                   descripcion AS "Descripcion", modelo_etiqueta AS "ModeloEtiqueta",
                   precio_msrp_cop AS "PrecioMsrpCop", stock_total AS "StockTotal"
            FROM candidatos
            -- Garantiza cupo real en el resultado final: los mejores 2 de cada marca
            -- compiten primero entre sí (evita que una sola marca con más candidatos
            -- cercanos tape por completo a las demás), y solo después se llena el resto
            -- del cupo por relevancia global.
            ORDER BY LEAST(puesto_final_en_marca, @GarantizadosPorMarca), (stock_total > 0) DESC, distancia
            LIMIT @Limit
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<ProductoDto>(
            sql, new { QueryVector = queryVector, PorMarca = 5, GarantizadosPorMarca = 2, Limit = limit })).AsList();
    }

    private async Task<IReadOnlyList<ProductoDto>> BuscarCamarasDeRedAsync(string queryVector, int limit, CancellationToken ct)
    {
        const string sql = """
            SELECT p.codigo_sap AS "CodigoSap", m.nombre AS "Marca", c.nombre AS "Categoria",
                   p.linea AS "Linea", p.serie AS "Serie", p.sub_serie AS "SubSerie", p.modelo AS "Modelo",
                   p.parametro_1 AS "Parametro1", p.parametro_2 AS "Parametro2", p.parametro_3 AS "Parametro3",
                   p.descripcion AS "Descripcion", p.modelo_etiqueta AS "ModeloEtiqueta",
                   pr.precio_msrp_cop AS "PrecioMsrpCop",
                   (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = p.codigo_sap) AS "StockTotal"
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id_marca
            JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN precios pr ON pr.codigo_sap = p.codigo_sap
            WHERE p.activo = TRUE AND p.embedding IS NOT NULL
              AND p.modelo ~ '^(DS-2CD|iDS-2C|DS-2DE|DS-2DF)'
            ORDER BY (SELECT COALESCE(SUM(i2.cantidad_disponible), 0) FROM inventario i2 WHERE i2.codigo_sap = p.codigo_sap) > 0 DESC,
                     p.embedding <=> @QueryVector::vector
            LIMIT @Limit
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<ProductoDto>(sql, new { QueryVector = queryVector, Limit = limit })).AsList();
    }

    private async Task<IReadOnlyList<ProductoDto>> BuscarPorTipoDeCamaraAsync(string patronTipo, string queryVector, int limit, CancellationToken ct)
    {
        const string sql = """
            SELECT p.codigo_sap AS "CodigoSap", m.nombre AS "Marca", c.nombre AS "Categoria",
                   p.linea AS "Linea", p.serie AS "Serie", p.sub_serie AS "SubSerie", p.modelo AS "Modelo",
                   p.parametro_1 AS "Parametro1", p.parametro_2 AS "Parametro2", p.parametro_3 AS "Parametro3",
                   p.descripcion AS "Descripcion", p.modelo_etiqueta AS "ModeloEtiqueta",
                   pr.precio_msrp_cop AS "PrecioMsrpCop",
                   (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = p.codigo_sap) AS "StockTotal"
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id_marca
            JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN precios pr ON pr.codigo_sap = p.codigo_sap
            WHERE p.activo = TRUE AND p.embedding IS NOT NULL
              AND p.parametro_1 ILIKE @PatronTipo
            ORDER BY (SELECT COALESCE(SUM(i2.cantidad_disponible), 0) FROM inventario i2 WHERE i2.codigo_sap = p.codigo_sap) > 0 DESC,
                     p.embedding <=> @QueryVector::vector
            LIMIT @Limit
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<ProductoDto>(sql, new { PatronTipo = patronTipo, QueryVector = queryVector, Limit = limit })).AsList();
    }

    // El alcance IR se extrae de la descripcion libre por regex (dos formatos vistos en
    // el catalogo: "80 m IR distance" y "IR 30m ..."), no existe como columna estructurada.
    private async Task<IReadOnlyList<ProductoDto>> BuscarPorAlcanceIrAsync(int minMetros, string queryVector, int limit, CancellationToken ct)
    {
        const string sql = """
            SELECT codigo_sap AS "CodigoSap", marca AS "Marca", categoria AS "Categoria",
                   linea AS "Linea", serie AS "Serie", sub_serie AS "SubSerie", modelo AS "Modelo",
                   parametro_1 AS "Parametro1", parametro_2 AS "Parametro2", parametro_3 AS "Parametro3",
                   descripcion AS "Descripcion", modelo_etiqueta AS "ModeloEtiqueta",
                   precio_msrp_cop AS "PrecioMsrpCop", stock_total AS "StockTotal"
            FROM (
                SELECT p.codigo_sap, m.nombre AS marca, c.nombre AS categoria,
                       p.linea, p.serie, p.sub_serie, p.modelo,
                       p.parametro_1, p.parametro_2, p.parametro_3,
                       p.descripcion, p.modelo_etiqueta, pr.precio_msrp_cop,
                       (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = p.codigo_sap) AS stock_total,
                       p.embedding <=> @QueryVector::vector AS distancia,
                       GREATEST(
                           COALESCE((regexp_match(p.descripcion, '(\d+)\s*m\s*IR', 'i'))[1]::int, 0),
                           COALESCE((regexp_match(p.descripcion, 'IR[^0-9]{0,12}(\d+)\s*m\b', 'i'))[1]::int, 0)
                       ) AS ir_metros
                FROM productos p
                JOIN marcas m ON p.id_marca = m.id_marca
                JOIN categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN precios pr ON pr.codigo_sap = p.codigo_sap
                WHERE p.activo = TRUE AND p.embedding IS NOT NULL
            ) sub
            WHERE ir_metros >= @MinMetros
            ORDER BY (stock_total > 0) DESC, ir_metros DESC, distancia
            LIMIT @Limit
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<ProductoDto>(sql, new { MinMetros = minMetros, QueryVector = queryVector, Limit = limit })).AsList();
    }

    // parametro_1 en DVR/NVR SI es la cantidad de canales como valor exacto (ej. "4"),
    // pero se filtra aparte del ranking semantico: se ordena por precio ascendente para
    // que "economico"/"barato" (que el embedding no entiende como orden numerico) se
    // resuelva de forma determinista mostrando primero lo mas barato que SI cumple el
    // numero exacto de canales pedido.
    private async Task<IReadOnlyList<ProductoDto>> BuscarPorCanalesGrabadorAsync(int canales, string queryVector, int limit, CancellationToken ct)
    {
        const string sql = """
            SELECT p.codigo_sap AS "CodigoSap", m.nombre AS "Marca", c.nombre AS "Categoria",
                   p.linea AS "Linea", p.serie AS "Serie", p.sub_serie AS "SubSerie", p.modelo AS "Modelo",
                   p.parametro_1 AS "Parametro1", p.parametro_2 AS "Parametro2", p.parametro_3 AS "Parametro3",
                   p.descripcion AS "Descripcion", p.modelo_etiqueta AS "ModeloEtiqueta",
                   pr.precio_msrp_cop AS "PrecioMsrpCop",
                   (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = p.codigo_sap) AS "StockTotal"
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id_marca
            JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN precios pr ON pr.codigo_sap = p.codigo_sap
            WHERE p.activo = TRUE
              AND c.nombre = 'Backend Products'
              AND p.linea IN ('DVR', 'Network Video Recorders')
              AND p.parametro_1 = @Canales::text
            ORDER BY (SELECT COALESCE(SUM(i2.cantidad_disponible), 0) FROM inventario i2 WHERE i2.codigo_sap = p.codigo_sap) > 0 DESC,
                     pr.precio_msrp_cop ASC NULLS LAST
            LIMIT @Limit
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<ProductoDto>(sql, new { Canales = canales, QueryVector = queryVector, Limit = limit })).AsList();
    }

    public async Task<IReadOnlyList<StockDto>> VerificarStockAsync(string query, CancellationToken ct = default)
    {
        // El LLM a veces reformatea el nombre del modelo al pasarlo como argumento
        // (ej. "DS-2CE56H0T-IRMMF 2.8mm" en vez de "DS-2CE56H0T-IRMMF(2.8mm)(C)"), lo
        // que rompe un ILIKE literal aunque el producto sí tenga stock. Comparar tras
        // quitar todo lo que no sea letra/dígito hace el match tolerante a paréntesis,
        // espacios y puntos sin perder precisión (el código SAP ya es solo dígitos).
        const string sql = """
            SELECT codigo_sap AS "CodigoSap", marca AS "Marca", modelo AS "Modelo",
                   codigo_bodega AS "CodigoBodega", nombre_sucursal AS "NombreSucursal", ciudad AS "Ciudad",
                   cantidad_disponible AS "CantidadDisponible", precio_msrp_cop AS "PrecioMsrpCop"
            FROM vista_stock
            WHERE regexp_replace(modelo, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(@Query, '[^a-zA-Z0-9]', '', 'g') || '%'
               OR codigo_sap ILIKE @Pattern
            ORDER BY modelo, codigo_bodega
            """;

        using var conn = _connectionFactory.Create();
        return (await conn.QueryAsync<StockDto>(sql, new { Query = query, Pattern = $"%{query}%" })).AsList();
    }

    public async Task<IReadOnlyList<ProductoDto>> VentasCruzadasAsync(string query, int limit = 5, CancellationToken ct = default)
    {
        const string sql = """
            WITH base AS (
                SELECT id_marca, id_categoria, codigo_sap
                FROM productos
                WHERE modelo ILIKE @Pattern OR codigo_sap ILIKE @Pattern
                LIMIT 1
            )
            SELECT vc.codigo_sap AS "CodigoSap", vc.marca AS "Marca", vc.categoria AS "Categoria",
                   vc.linea AS "Linea", vc.serie AS "Serie", vc.sub_serie AS "SubSerie", vc.modelo AS "Modelo",
                   vc.parametro_1 AS "Parametro1", vc.parametro_2 AS "Parametro2", vc.parametro_3 AS "Parametro3",
                   vc.descripcion AS "Descripcion", vc.modelo_etiqueta AS "ModeloEtiqueta",
                   vc.precio_msrp_cop AS "PrecioMsrpCop",
                   (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = vc.codigo_sap) AS "StockTotal"
            FROM vista_catalogo vc
            JOIN productos p ON p.codigo_sap = vc.codigo_sap
            JOIN base b ON p.id_categoria = b.id_categoria AND p.codigo_sap <> b.codigo_sap
            ORDER BY (p.id_marca = b.id_marca) DESC, vc.modelo
            LIMIT @Limit
            """;

        using var conn = _connectionFactory.Create();
        var rows = (await conn.QueryAsync<ProductoDto>(sql, new { Pattern = $"%{query}%", Limit = limit })).AsList();
        foreach (var p in rows)
        {
            p.ImagenUrl = CloudinaryImageBase + p.CodigoSap;
        }
        return rows;
    }

    public async Task<ProductoDto?> GetByCodigoSapAsync(string codigoSap, CancellationToken ct = default)
    {
        const string sql = """
            SELECT vc.codigo_sap AS "CodigoSap", vc.marca AS "Marca", vc.categoria AS "Categoria",
                   vc.linea AS "Linea", vc.serie AS "Serie", vc.sub_serie AS "SubSerie", vc.modelo AS "Modelo",
                   vc.parametro_1 AS "Parametro1", vc.parametro_2 AS "Parametro2", vc.parametro_3 AS "Parametro3",
                   vc.descripcion AS "Descripcion", vc.modelo_etiqueta AS "ModeloEtiqueta",
                   vc.precio_msrp_cop AS "PrecioMsrpCop",
                   (SELECT COALESCE(SUM(i.cantidad_disponible), 0) FROM inventario i WHERE i.codigo_sap = vc.codigo_sap) AS "StockTotal"
            FROM vista_catalogo vc
            WHERE vc.codigo_sap = @CodigoSap
            """;

        using var conn = _connectionFactory.Create();
        var p = await conn.QueryFirstOrDefaultAsync<ProductoDto>(sql, new { CodigoSap = codigoSap });
        if (p is not null)
        {
            p.ImagenUrl = CloudinaryImageBase + p.CodigoSap;
        }
        return p;
    }
}
