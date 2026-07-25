-- ============================================================
-- HELITEB – Reset del catálogo para demo en vivo
-- ============================================================
-- Elimina productos, inventario, precios, imágenes y cotizaciones
-- conservando: bodegas (seed permanente), app_config (SMTP),
--              asesores y asesor_auth (no se borran en el reset).
--
-- Ejecutar en pgAdmin (localhost:5050) → Query Tool, o con psql:
--   psql -h localhost -p 5432 -U heliteb_user -d heliteb -f reset_catalogo.sql
-- ============================================================

BEGIN;

TRUNCATE TABLE inventario   RESTART IDENTITY CASCADE;
TRUNCATE TABLE precios      RESTART IDENTITY CASCADE;
TRUNCATE TABLE productos    RESTART IDENTITY CASCADE;
TRUNCATE TABLE categorias   RESTART IDENTITY CASCADE;
TRUNCATE TABLE marcas       RESTART IDENTITY CASCADE;
TRUNCATE TABLE cotizaciones RESTART IDENTITY CASCADE;

COMMIT;

-- Verificación
SELECT
  (SELECT COUNT(*) FROM marcas)      AS marcas,
  (SELECT COUNT(*) FROM categorias)  AS categorias,
  (SELECT COUNT(*) FROM productos)   AS productos,
  (SELECT COUNT(*) FROM inventario)  AS inventario,
  (SELECT COUNT(*) FROM cotizaciones)AS cotizaciones,
  (SELECT COUNT(*) FROM bodegas)     AS bodegas_conservadas,
  (SELECT COUNT(*) FROM asesores)    AS asesores_conservados;
