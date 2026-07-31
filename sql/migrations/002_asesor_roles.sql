-- ---------------------------------------------------------------------------
-- Rol de asesor (admin vs asesor normal).
--
-- Hasta ahora cualquier asesor con sesión podía crear o borrar otros asesores
-- (AsesoresController solo exigía "estar logueado", no "ser admin"). Se agrega
-- un rol real para poder restringir esas acciones - ver AsesoresController y
-- la policy "AdminOnly" en Program.cs.
-- ---------------------------------------------------------------------------

ALTER TABLE asesores ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'asesor';

COMMENT ON COLUMN asesores.rol IS
    '''admin'' puede crear/borrar asesores; ''asesor'' es el rol por defecto para todos los demás.';

-- El admin sembrado en schema.sql pasa a ser 'admin' real.
UPDATE asesores SET rol = 'admin' WHERE LOWER(email) = 'jose.rodriguez@heliteb.co';
