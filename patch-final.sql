-- ============================================================
-- PATCH FINAL — Ejecutar en Supabase SQL Editor
-- Permite todas las operaciones sin restricciones de RLS
-- (la seguridad la gestiona la app vía service_role_key)
-- ============================================================

-- 1. Asegurar columnas necesarias
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS campos JSONB NOT NULL DEFAULT '[]';
ALTER TABLE items ADD COLUMN IF NOT EXISTS atributos JSONB NOT NULL DEFAULT '{}';
ALTER TABLE items ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1;

-- 2. Limpiar todas las políticas antiguas
DROP POLICY IF EXISTS "cat_read"       ON categorias;
DROP POLICY IF EXISTS "cat_insert"     ON categorias;
DROP POLICY IF EXISTS "cat_update"     ON categorias;
DROP POLICY IF EXISTS "cat_delete"     ON categorias;
DROP POLICY IF EXISTS "cat_escritura"  ON categorias;
DROP POLICY IF EXISTS "cat_lectura"    ON categorias;
DROP POLICY IF EXISTS "items_read"     ON items;
DROP POLICY IF EXISTS "items_insert"   ON items;
DROP POLICY IF EXISTS "items_update"   ON items;
DROP POLICY IF EXISTS "items_delete"   ON items;
DROP POLICY IF EXISTS "items_write"    ON items;
DROP POLICY IF EXISTS "items_upd"      ON items;
DROP POLICY IF EXISTS "scan_publico"   ON items;
DROP POLICY IF EXISTS "items_lectura"  ON items;
DROP POLICY IF EXISTS "items_insercion" ON items;
DROP POLICY IF EXISTS "items_actualizacion" ON items;
DROP POLICY IF EXISTS "lectura_publica"    ON items;
DROP POLICY IF EXISTS "insercion_publica"  ON items;
DROP POLICY IF EXISTS "actualizacion_publica" ON items;

-- 3. Crear políticas completamente abiertas
--    (el service_role bypasea RLS de todas formas, esto es por si se usa anon key)
CREATE POLICY "acceso_total" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON items      FOR ALL USING (true) WITH CHECK (true);

-- 4. Actualizar categoría Conos con medida como texto libre
UPDATE categorias
SET campos = '[
  {"nombre":"tipo","label":"Tipo","tipo":"select","opciones":["roller","sunscreen","duo","blackout","screen"],"requerido":true},
  {"nombre":"color","label":"Color","tipo":"text","requerido":true},
  {"nombre":"medida","label":"Medida","tipo":"text","requerido":false},
  {"nombre":"alto","label":"Alto","tipo":"text","requerido":false},
  {"nombre":"ancho","label":"Ancho","tipo":"text","requerido":false}
]'::jsonb
WHERE nombre = 'Conos';

-- 5. Verificar
SELECT 'categorias' as tabla, COUNT(*) FROM categorias
UNION ALL SELECT 'items', COUNT(*) FROM items;

SELECT nombre, jsonb_array_length(campos) as campos FROM categorias;
