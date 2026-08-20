-- =============================================================================
-- 003 — Stock real de Heliteb (Odoo) cruzado contra la lista del proveedor
-- =============================================================================
-- `productos` sigue siendo la lista del PROVEEDOR (PK codigo_sap, una fila por
-- variante de lente). Lo que tenemos físicamente vive en Odoo con OTRA llave: el
-- SKU (product.template.default_code), que agrupa varias variantes en una sola
-- ficha. Colgar el stock del codigo_sap duplicaría inventario: una cámara
-- DS-2CE16D0T-IRF en bodega respalda a la vez el SAP de 2.8mm y el de 3.6mm.
--
-- Por eso el stock se guarda colgado del SKU (stock_items / stock_existencias) y
-- el cruce vive en una tabla puente (producto_stock) que además dice CÓMO se
-- cruzó y si ese SKU es exclusivo de un SAP o compartido por una familia.
-- =============================================================================

-- Distingue lo que trae la lista de precios del proveedor de lo que solo
-- tenemos nosotros en bodega (descontinuado por el proveedor, o comprado antes).
ALTER TABLE productos ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'proveedor';

-- -----------------------------------------------------------------------------
-- Ficha de producto tal como existe en Odoo (nuestro maestro real de inventario)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_items (
    sku              VARCHAR(80) PRIMARY KEY,       -- product.template.default_code
    odoo_tmpl_id     INT,
    nombre           TEXT,
    marca            VARCHAR(80),
    codigo_sap_odoo  VARCHAR(50),                   -- x_studio_cdigo_sap
    costo            NUMERIC(15, 2),
    activo           BOOLEAN DEFAULT TRUE,
    -- TRUE si el mismo default_code aparece en más de una ficha de Odoo. Pasa
    -- cuando se recrea un producto ("NUEVO ...", "-Old", "(O-STD)") en vez de
    -- corregir el existente, y deja el inventario partido entre las dos fichas.
    duplicado_odoo   BOOLEAN DEFAULT FALSE,
    actualizado_en   TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Existencias por bodega. NO usa `bodegas` como llave foránea a propósito: Odoo
-- tiene 47 almacenes (sedes, garantías, proyectos, técnicos, CEDIS) y `bodegas`
-- solo modela las 10 sucursales de venta del Excel original.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_existencias (
    id             SERIAL PRIMARY KEY,
    sku            VARCHAR(80) REFERENCES stock_items(sku) ON DELETE CASCADE,
    -- El código corto NO es único en Odoo (DLTD y MiniMayorista comparten "00";
    -- ADMON y PR-02 tienen dos ubicaciones cada uno), así que la llave natural es
    -- el nombre completo de la ubicación, no el código.
    codigo_bodega  VARCHAR(20)  NOT NULL,
    nombre_bodega  VARCHAR(120) NOT NULL,
    -- 'sede'      -> mostrador, es lo que el cliente puede recoger hoy
    -- 'central'   -> bodega logística/CEDIS, sirve pero requiere traslado
    -- 'garantias' -> NO vendible, son equipos en proceso de garantía
    -- 'otra'      -> proyectos, técnicos, consumos internos: tampoco vendible
    tipo_bodega    VARCHAR(20)  NOT NULL,
    cantidad       NUMERIC(14, 2) NOT NULL DEFAULT 0,
    UNIQUE (sku, nombre_bodega)
);

CREATE INDEX IF NOT EXISTS idx_stock_exist_sku  ON stock_existencias(sku);
CREATE INDEX IF NOT EXISTS idx_stock_exist_tipo ON stock_existencias(tipo_bodega);

-- -----------------------------------------------------------------------------
-- Puente lista del proveedor <-> lo que tenemos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto_stock (
    codigo_sap  VARCHAR(50) REFERENCES productos(codigo_sap)  ON DELETE CASCADE,
    sku         VARCHAR(80) REFERENCES stock_items(sku)       ON DELETE CASCADE,
    -- 'sap'         -> el código SAP de Odoo coincide con el de la lista (fiable)
    -- 'modelo'      -> el SKU es idéntico al modelo del proveedor (fiable)
    -- 'modelo_base' -> coinciden ignorando el lente (aproximado, ver exclusivo)
    metodo      VARCHAR(20) NOT NULL,
    -- FALSE = este SKU respalda varias variantes del Excel y el inventario NO
    -- distingue cuál está físicamente en bodega. El agente debe decirlo.
    exclusivo   BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (codigo_sap, sku)
);

CREATE INDEX IF NOT EXISTS idx_producto_stock_sku ON producto_stock(sku);

-- -----------------------------------------------------------------------------
-- Vista que responde la pregunta del negocio: ¿lo tenemos o hay que pedirlo?
-- -----------------------------------------------------------------------------
-- CREATE OR REPLACE no permite insertar columnas en medio de una vista existente
-- (Postgres solo deja agregarlas al final), y esta vista se re-crea en cada carga.
DROP VIEW IF EXISTS vista_disponibilidad;

CREATE VIEW vista_disponibilidad AS
WITH cruce AS (
    SELECT ps.codigo_sap,
           bool_and(ps.exclusivo)                                       AS exclusivo,
           min(ps.metodo)                                               AS metodo,
           bool_or(si.duplicado_odoo)                                   AS duplicado_odoo,
           -- Identifica la pila física de inventario. Dos codigo_sap distintos con el
           -- MISMO sku_inventario comparten las mismas unidades: no se pueden sumar.
           string_agg(DISTINCT ps.sku, ', ')                            AS sku_inventario,
           sum(e.cantidad) FILTER (WHERE e.tipo_bodega = 'sede')        AS uds_sedes,
           sum(e.cantidad) FILTER (WHERE e.tipo_bodega = 'central')     AS uds_central,
           -- La etiqueta lleva la CIUDAD por delante. Con el nombre crudo de la
           -- ubicación ("01/STOCK-A. OBRERO") el agente tenía que adivinar dónde
           -- queda cada sede, y adivinaba mal: llegó a decir "Montería (sede
           -- Obrero)" cuando Obrero es de Valledupar. Si la bodega no es una de
           -- las 10 sucursales de venta (bodega central, CEDIS), no hay ciudad
           -- que agregar y se deja el nombre tal cual.
           jsonb_object_agg(
               CASE WHEN b.ciudad IS NULL THEN e.nombre_bodega
                    ELSE b.ciudad || ' - ' || replace(b.nombre_sucursal, 'STOCK-', '')
               END, e.cantidad)
             FILTER (WHERE e.tipo_bodega IN ('sede', 'central') AND e.cantidad > 0) AS desglose
    FROM producto_stock ps
    JOIN stock_items       si ON si.sku = ps.sku
    LEFT JOIN stock_existencias e ON e.sku = ps.sku
    LEFT JOIN bodegas      b  ON b.codigo_bodega = e.codigo_bodega
    GROUP BY ps.codigo_sap
)
SELECT p.codigo_sap,
       m.nombre  AS marca,
       c.nombre  AS categoria,
       p.modelo,
       p.descripcion,
       p.origen,
       pr.precio_msrp_cop,
       COALESCE(cr.uds_sedes,   0) AS uds_sedes,
       COALESCE(cr.uds_central, 0) AS uds_central,
       COALESCE(cr.exclusivo, TRUE) AS variante_exacta,
       COALESCE(cr.duplicado_odoo, FALSE) AS duplicado_odoo,
       cr.sku_inventario,
       cr.metodo AS metodo_cruce,
       cr.desglose,
       CASE
           WHEN COALESCE(cr.uds_sedes, 0)   > 0 THEN 'EN_SEDE'
           WHEN COALESCE(cr.uds_central, 0) > 0 THEN 'EN_BODEGA_CENTRAL'
           WHEN cr.codigo_sap IS NOT NULL       THEN 'AGOTADO'
           ELSE 'BAJO_PEDIDO'
       END AS disponibilidad,
       -- Agregada por 008_imagen_producto.sql. Va aqui tambien porque esta vista
       -- se re-crea en CADA carga del ETL (ver escribir() en cargar_catalogo.py),
       -- asi que si esta columna solo vive en 008 el refresco horario de stock
       -- la vuelve a borrar en la primera corrida despues del deploy.
       p.imagen_url
FROM productos p
JOIN marcas       m  ON m.id_marca     = p.id_marca
LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
LEFT JOIN precios   pr ON pr.codigo_sap  = p.codigo_sap
LEFT JOIN cruce     cr ON cr.codigo_sap  = p.codigo_sap
WHERE p.activo = TRUE;
