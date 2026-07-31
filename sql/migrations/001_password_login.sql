-- ---------------------------------------------------------------------------
-- Login del panel por correo + contraseña.
--
-- Hasta ahora la única credencial del asesor era el teléfono + OTP por WhatsApp
-- (asesor_auth). El panel nuevo necesita un login clásico, así que se agrega un
-- hash de contraseña sobre la fila de asesores que ya existe. El teléfono sigue
-- siendo la identidad interna (el JWT y todo lo que el bot asocia a ese número
-- dependen de él); el correo pasa a ser el identificador de ingreso.
--
-- El OTP NO se elimina: el bot de WhatsApp lo sigue usando para verificar
-- asesores antes de emitir cotizaciones.
-- ---------------------------------------------------------------------------

ALTER TABLE asesores ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- El correo pasa a ser credencial de ingreso, así que debe ser único. Se crea
-- como índice único en vez de constraint para poder usar IF NOT EXISTS.
CREATE UNIQUE INDEX IF NOT EXISTS ux_asesores_email ON asesores (LOWER(email));

COMMENT ON COLUMN asesores.password_hash IS
    'PBKDF2-HMAC-SHA256 en formato pbkdf2$iteraciones$salt_b64$hash_b64. NULL = el asesor aún no puede entrar al panel.';

-- Contraseña inicial del asesor administrador sembrado en schema.sql. Rotarla
-- desde el panel apenas se despliegue, vía POST /api/auth/cambiar-password.
-- Solo se aplica si aún no tiene contraseña, para que re-ejecutar la migración
-- nunca pise una contraseña ya cambiada.
UPDATE asesores
   SET password_hash = 'pbkdf2$210000$AeO6fjI6lU8PTOprI06+bg==$Bj15n/SNdSNGqTErFpDvw3UaBxmJeIOjFggaCDuQJQo='
 WHERE LOWER(email) = 'jose.rodriguez@heliteb.co'
   AND password_hash IS NULL;
