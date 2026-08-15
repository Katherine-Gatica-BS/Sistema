-- ============================================================
-- PATCH v7 — Ejecutar en Supabase SQL Editor
-- Fixes: columna "campos" en categorias + medida como texto libre
-- ============================================================

-- 1. Asegurar que la columna "campos" existe en categorias
--    (puede faltar si corriste un SQL antiguo)
ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS campos JSONB NOT NULL DEFAULT '[]';

-- 2. Asegurar que la tabla items tiene la columna "atributos" JSONB
--    (puede llamarse distinto en versiones antiguas)
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS atributos JSONB NOT NULL DEFAULT '{}';

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1;

-- 3. Arreglar la categoría "Conos" — cambiar medida de "select" a "text"
--    para que se pueda escribir libremente (ej: "2.5m", "30 metros", etc.)
UPDATE categorias
SET campos = '[
  {"nombre":"tipo","label":"Tipo","tipo":"select","opciones":["roller","sunscreen","duo","blackout","screen"],"requerido":true},
  {"nombre":"color","label":"Color","tipo":"text","requerido":true},
  {"nombre":"medida","label":"Medida","tipo":"text","requerido":false},
  {"nombre":"alto","label":"Alto","tipo":"text","requerido":false},
  {"nombre":"ancho","label":"Ancho","tipo":"text","requerido":false}
]'::jsonb
WHERE nombre = 'Conos';

-- 4. Política pública para escaneo sin login
DROP POLICY IF EXISTS "scan_publico" ON items;
CREATE POLICY "scan_publico"
  ON items FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. Asegurar RLS completo
DROP POLICY IF EXISTS "cat_read"   ON categorias;
DROP POLICY IF EXISTS "cat_insert" ON categorias;
DROP POLICY IF EXISTS "cat_update" ON categorias;
DROP POLICY IF EXISTS "cat_delete" ON categorias;

CREATE POLICY "cat_read"   ON categorias FOR SELECT               USING (true);
CREATE POLICY "cat_insert" ON categorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cat_update" ON categorias FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cat_delete" ON categorias FOR DELETE TO authenticated USING (true);

-- 6. Verificar resultado
SELECT
  nombre,
  icono,
  jsonb_array_length(campos) AS num_campos,
  campos
FROM categorias
ORDER BY nombre;
