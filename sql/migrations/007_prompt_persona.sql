-- Persona/estilo de venta editable desde el panel, sin tocar código ni
-- redesplegar. Una fila por canal: hoy solo "whatsapp" la usa (ver
-- SystemPrompt.BuildVendedorSection). Si la fila no existe, el agente usa el
-- texto por defecto hardcodeado en SystemPrompt.PersonaVendedorPorDefecto.
CREATE TABLE IF NOT EXISTS prompt_persona (
    canal varchar(20) PRIMARY KEY,
    contenido text NOT NULL,
    actualizado_en timestamptz NOT NULL DEFAULT now()
);
