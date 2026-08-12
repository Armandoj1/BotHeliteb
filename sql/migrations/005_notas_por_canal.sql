-- 005 - Notas del agente por canal
--
-- El bot debe comportarse distinto segun quien escribe: por WhatsApp/CRM habla
-- el cliente final y hay que venderle; en el escritorio consulta un asesor del
-- equipo. Las notas editables desde el panel ahora se pueden marcar para un
-- canal, para afinar uno sin cambiarle el comportamiento al otro.
--
-- canal NULL = la nota aplica a los dos canales, que es como venian
-- comportandose las notas existentes: por eso no hace falta migrar datos.

ALTER TABLE agente_notas ADD COLUMN IF NOT EXISTS canal varchar(20);

-- El agente lee las notas en cada turno filtrando por canal.
CREATE INDEX IF NOT EXISTS idx_agente_notas_activo_canal
    ON agente_notas (activo, canal);