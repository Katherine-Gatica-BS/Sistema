-- ============================================================
-- Inventario Pro — SQL completo v5
-- Campos dinámicos por categoría, sistema multi-producto
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Tabla categorias (con campos JSON)
CREATE TABLE IF NOT EXISTS categorias (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT        NOT NULL UNIQUE,
  icono          TEXT        NOT NULL DEFAULT '📦',
  color          TEXT        NOT NULL DEFAULT '#0ea5e9',
  campos         JSONB       NOT NULL DEFAULT '[]',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla items (atributos dinámicos en JSONB)
CREATE TABLE IF NOT EXISTS items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id   UUID        NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  estado         TEXT        NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','usado')),
  atributos      JSONB       NOT NULL DEFAULT '{}',
  cantidad       INTEGER     NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_uso      TIMESTAMPTZ NULL
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_items_estado    ON items(estado);
CREATE INDEX IF NOT EXISTS idx_items_categoria ON items(categoria_id);
CREATE INDEX IF NOT EXISTS idx_items_fecha     ON items(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_items_atributos ON items USING gin(atributos);

-- 4. RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE items      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_read"      ON categorias;
DROP POLICY IF EXISTS "cat_insert"    ON categorias;
DROP POLICY IF EXISTS "cat_update"    ON categorias;
DROP POLICY IF EXISTS "cat_delete"    ON categorias;
DROP POLICY IF EXISTS "items_read"    ON items;
DROP POLICY IF EXISTS "items_insert"  ON items;
DROP POLICY IF EXISTS "items_update"  ON items;
DROP POLICY IF EXISTS "items_delete"  ON items;

-- Categorías: lectura pública, escritura autenticada
CREATE POLICY "cat_read"   ON categorias FOR SELECT               USING (true);
CREATE POLICY "cat_insert" ON categorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cat_update" ON categorias FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cat_delete" ON categorias FOR DELETE TO authenticated USING (true);

-- Items: lectura pública, escritura autenticada
CREATE POLICY "items_read"   ON items FOR SELECT               USING (true);
CREATE POLICY "items_insert" ON items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "items_update" ON items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "items_delete" ON items FOR DELETE TO authenticated USING (true);

-- 5. Categorías iniciales con campos
INSERT INTO categorias (nombre, icono, color, campos) VALUES
(
  'Conos', '🪟', '#0ea5e9',
  '[
    {"nombre":"tipo","label":"Tipo","tipo":"select","opciones":["roller","sunscreen","duo","blackout","screen"],"requerido":true},
    {"nombre":"color","label":"Color","tipo":"text","requerido":true},
    {"nombre":"alto","label":"Alto","tipo":"text","requerido":false},
    {"nombre":"ancho","label":"Ancho","tipo":"text","requerido":false}
  ]'::jsonb
),
(
  'Retazos', '🧵', '#10b981',
  '[
    {"nombre":"material","label":"Material","tipo":"text","requerido":true},
    {"nombre":"color","label":"Color","tipo":"text","requerido":true},
    {"nombre":"largo","label":"Largo","tipo":"text","requerido":false},
    {"nombre":"ancho","label":"Ancho","tipo":"text","requerido":false}
  ]'::jsonb
)
ON CONFLICT (nombre) DO NOTHING;

-- 6. Migrar conos antiguos si existen
DO $$
BEGIN
  -- Migrar desde tabla "conos" antigua si existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conos') THEN
    INSERT INTO items (categoria_id, estado, atributos, cantidad, fecha_creacion, fecha_uso)
    SELECT
      (SELECT id FROM categorias WHERE nombre = 'Conos'),
      COALESCE(estado, 'disponible'),
      jsonb_build_object('tipo', COALESCE(tipo,''), 'color', COALESCE(color,''), 'alto', COALESCE(medida,'')),
      1,
      fecha_creacion,
      fecha_uso
    FROM conos
    WHERE NOT EXISTS (
      SELECT 1 FROM items i
      WHERE i.fecha_creacion = conos.fecha_creacion
        AND i.atributos->>'tipo' = conos.tipo
    );
    RAISE NOTICE 'Conos migrados';
  END IF;

  -- Migrar desde tabla "items" antigua con columnas planas (tipo, color, alto, ancho)
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'tipo'
  ) THEN
    RAISE NOTICE 'La tabla items ya tiene columna "tipo" (esquema viejo). Migra los datos manualmente si es necesario.';
  END IF;
END $$;

-- 7. Verificar
SELECT c.nombre, c.icono, COUNT(i.id) AS total_items
FROM categorias c
LEFT JOIN items i ON i.categoria_id = c.id
GROUP BY c.id, c.nombre, c.icono
ORDER BY c.nombre;
