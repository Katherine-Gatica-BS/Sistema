-- ============================================================
-- BASE DE DATOS COMPLETA — CORTINA QR
-- Ejecutar completo en Supabase → SQL Editor → Run
-- ============================================================

-- 1. Crear tabla categorias
CREATE TABLE IF NOT EXISTS categorias (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT        NOT NULL UNIQUE,
  icono          TEXT        NOT NULL DEFAULT '📦',
  color          TEXT        NOT NULL DEFAULT '#0ea5e9',
  campos         JSONB       NOT NULL DEFAULT '[]',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Crear tabla items
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

-- 4. RLS — acceso total (sin restricciones de autenticación)
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE items      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acceso_total" ON categorias;
DROP POLICY IF EXISTS "acceso_total" ON items;

CREATE POLICY "acceso_total" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON items      FOR ALL USING (true) WITH CHECK (true);

-- 5. Categorías iniciales con imágenes y campo zona
INSERT INTO categorias (nombre, icono, color, campos) VALUES
(
  'Conos', '/cat-conos.png', '#0ea5e9',
  '[
    {"nombre":"tipo","label":"Tipo","tipo":"select","opciones":["roller","sunscreen","duo","blackout","screen"],"requerido":true},
    {"nombre":"color","label":"Color","tipo":"text","requerido":true},
    {"nombre":"medida","label":"Medida","tipo":"text","requerido":false},
    {"nombre":"alto","label":"Alto","tipo":"text","requerido":false},
    {"nombre":"ancho","label":"Ancho","tipo":"text","requerido":false},
    {"nombre":"zona","label":"Zona","tipo":"select","opciones":["Zona A","Zona B","Zona C","Zona D"],"requerido":false}
  ]'::jsonb
),
(
  'Retazos', '/cat-retazos.png', '#10b981',
  '[
    {"nombre":"material","label":"Material","tipo":"text","requerido":true},
    {"nombre":"color","label":"Color","tipo":"text","requerido":true},
    {"nombre":"largo","label":"Largo","tipo":"text","requerido":false},
    {"nombre":"ancho","label":"Ancho","tipo":"text","requerido":false},
    {"nombre":"zona","label":"Zona","tipo":"select","opciones":["Zona A","Zona B","Zona C","Zona D"],"requerido":false}
  ]'::jsonb
),
(
  'Barras', '/cat-barras.png', '#8b5cf6',
  '[
    {"nombre":"tipo","label":"Tipo","tipo":"select","opciones":["simple","doble","motorizada"],"requerido":true},
    {"nombre":"material","label":"Material","tipo":"select","opciones":["aluminio","acero","madera"],"requerido":true},
    {"nombre":"largo","label":"Largo","tipo":"text","requerido":false},
    {"nombre":"color","label":"Color","tipo":"text","requerido":false},
    {"nombre":"zona","label":"Zona","tipo":"select","opciones":["Zona A","Zona B","Zona C","Zona D"],"requerido":false}
  ]'::jsonb
)
ON CONFLICT (nombre) DO UPDATE SET
  icono  = EXCLUDED.icono,
  color  = EXCLUDED.color,
  campos = EXCLUDED.campos;

-- 6. Si tienes datos en la tabla conos antigua, migrarlos:
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conos'
  ) THEN
    INSERT INTO items (categoria_id, estado, atributos, cantidad, fecha_creacion, fecha_uso)
    SELECT
      (SELECT id FROM categorias WHERE nombre = 'Conos'),
      COALESCE(estado, 'disponible'),
      jsonb_build_object(
        'tipo',   COALESCE(tipo, ''),
        'color',  COALESCE(color, ''),
        'medida', COALESCE(medida, '')
      ),
      1,
      fecha_creacion,
      fecha_uso
    FROM conos
    WHERE NOT EXISTS (
      SELECT 1 FROM items i
      WHERE i.atributos->>'tipo'  = conos.tipo
        AND i.fecha_creacion = conos.fecha_creacion
    );
    RAISE NOTICE 'Conos migrados OK';
  END IF;
END $$;

-- 7. Verificar resultado
SELECT nombre, icono, jsonb_array_length(campos) AS num_campos FROM categorias;
SELECT COUNT(*) AS total_items FROM items;
