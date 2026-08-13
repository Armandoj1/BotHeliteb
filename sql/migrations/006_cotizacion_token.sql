-- 006 - Enlace publico del PDF de cotizacion
--
-- Al cliente se le mandaba la URL cruda de Cloudinary: larga, con el proveedor,
-- el nombre de la cuenta y la carpeta a la vista. Y como el folio lleva marca de
-- tiempo, se podian probar folios vecinos para leer cotizaciones ajenas.
--
-- Ahora cada cotizacion tiene un token aleatorio y se entrega /c/{token}.

ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS token varchar(16);

-- Las cotizaciones ya emitidas tambien necesitan enlace: se les asigna uno.
UPDATE cotizaciones
   SET token = substr(md5(random()::text || id::text), 1, 12)
 WHERE token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cotizaciones_token ON cotizaciones (token);
