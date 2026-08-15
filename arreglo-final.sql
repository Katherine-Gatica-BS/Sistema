-- ============================================================
-- ARREGLO FINAL — Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Asegurar columnas necesarias
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS campos   JSONB   NOT NULL DEFAULT '[]';
ALTER TABLE items      ADD COLUMN IF NOT EXISTS atributos JSONB  NOT NULL DEFAULT '{}';
ALTER TABLE items      ADD COLUMN IF NOT EXISTS cantidad  INTEGER NOT NULL DEFAULT 1;

-- 2. Normalizar NULLs (sintaxis correcta)
UPDATE items SET atributos = '{}'::jsonb WHERE atributos IS NULL;
UPDATE items SET cantidad  = 1           WHERE cantidad  IS NULL;

-- 3. Actualizar íconos con las imágenes subidas
UPDATE categorias SET icono = '/cat-conos.png'   WHERE nombre = 'Conos';
UPDATE categorias SET icono = '/cat-retazos.png' WHERE nombre = 'Retazos';
UPDATE categorias SET icono = '/cat-barras.png'  WHERE nombre = 'Barras';

-- 4. Agregar campo zona a categorías que no lo tienen
UPDATE categorias
SET campos = campos || '[{"nombre":"zona","label":"Zona","tipo":"select","opciones":["Zona A","Zona B","Zona C","Zona D"],"requerido":false}]'::jsonb
WHERE NOT (campos::text LIKE '%"nombre":"zona"%');

-- 5. Políticas RLS abiertas
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE items      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acceso_total_cat"   ON categorias;
DROP POLICY IF EXISTS "acceso_total_items" ON items;
DROP POLICY IF EXISTS "acceso_total"       ON categorias;
DROP POLICY IF EXISTS "acceso_total"       ON items;

CREATE POLICY "acceso_total" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON items      FOR ALL USING (true) WITH CHECK (true);

-- 6. Verificar resultado
SELECT nombre, icono, jsonb_array_length(campos) AS campos
FROM categorias ORDER BY nombre;
