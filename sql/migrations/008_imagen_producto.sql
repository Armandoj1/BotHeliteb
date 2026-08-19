-- La URL de foto de producto se armaba adivinando (cloud de Cloudinary equivocado
-- + codigo_sap, sin verificar que la imagen existiera). Se reemplaza por una
-- columna real, poblada solo cuando la foto de verdad se sube.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url text;

CREATE OR REPLACE VIEW vista_catalogo AS
 SELECT p.codigo_sap,
    m.nombre AS marca,
    c.nombre AS categoria,
    p.linea,
    p.serie,
    p.sub_serie,
    p.modelo,
    p.parametro_1,
    p.parametro_2,
    p.parametro_3,
    p.descripcion,
    p.modelo_etiqueta,
    pr.precio_msrp_cop,
    p.imagen_url
   FROM ((productos p
     JOIN marcas m ON ((p.id_marca = m.id_marca)))
     JOIN categorias c ON ((p.id_categoria = c.id_categoria)))
     LEFT JOIN precios pr ON (((p.codigo_sap)::text = (pr.codigo_sap)::text))
  WHERE (p.activo = true);

CREATE OR REPLACE VIEW vista_disponibilidad AS
 WITH cruce AS (
         SELECT ps.codigo_sap,
            bool_and(ps.exclusivo) AS exclusivo,
            min((ps.metodo)::text) AS metodo,
            bool_or(si.duplicado_odoo) AS duplicado_odoo,
            string_agg(DISTINCT (ps.sku)::text, ', '::text) AS sku_inventario,
            sum(e.cantidad) FILTER (WHERE ((e.tipo_bodega)::text = 'sede'::text)) AS uds_sedes,
            sum(e.cantidad) FILTER (WHERE ((e.tipo_bodega)::text = 'central'::text)) AS uds_central,
            jsonb_object_agg(
                CASE
                    WHEN (b.ciudad IS NULL) THEN (e.nombre_bodega)::text
                    ELSE (((b.ciudad)::text || ' - '::text) || replace((b.nombre_sucursal)::text, 'STOCK-'::text, ''::text))
                END, e.cantidad) FILTER (WHERE (((e.tipo_bodega)::text = ANY ((ARRAY['sede'::character varying, 'central'::character varying])::text[])) AND (e.cantidad > (0)::numeric))) AS desglose
           FROM (((producto_stock ps
             JOIN stock_items si ON (((si.sku)::text = (ps.sku)::text)))
             LEFT JOIN stock_existencias e ON (((e.sku)::text = (ps.sku)::text)))
             LEFT JOIN bodegas b ON (((b.codigo_bodega)::text = (e.codigo_bodega)::text)))
          GROUP BY ps.codigo_sap
        )
 SELECT p.codigo_sap,
    m.nombre AS marca,
    c.nombre AS categoria,
    p.modelo,
    p.descripcion,
    p.origen,
    pr.precio_msrp_cop,
    COALESCE(cr.uds_sedes, (0)::numeric) AS uds_sedes,
    COALESCE(cr.uds_central, (0)::numeric) AS uds_central,
    COALESCE(cr.exclusivo, true) AS variante_exacta,
    COALESCE(cr.duplicado_odoo, false) AS duplicado_odoo,
    cr.sku_inventario,
    cr.metodo AS metodo_cruce,
    cr.desglose,
        CASE
            WHEN (COALESCE(cr.uds_sedes, (0)::numeric) > (0)::numeric) THEN 'EN_SEDE'::text
            WHEN (COALESCE(cr.uds_central, (0)::numeric) > (0)::numeric) THEN 'EN_BODEGA_CENTRAL'::text
            WHEN (cr.codigo_sap IS NOT NULL) THEN 'AGOTADO'::text
            ELSE 'BAJO_PEDIDO'::text
        END AS disponibilidad,
    p.imagen_url
   FROM ((((productos p
     JOIN marcas m ON ((m.id_marca = p.id_marca)))
     LEFT JOIN categorias c ON ((c.id_categoria = p.id_categoria)))
     LEFT JOIN precios pr ON (((pr.codigo_sap)::text = (p.codigo_sap)::text)))
     LEFT JOIN cruce cr ON (((cr.codigo_sap)::text = (p.codigo_sap)::text)))
  WHERE (p.activo = true);
