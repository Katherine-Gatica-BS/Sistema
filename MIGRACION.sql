-- ============================================================
-- SCRIPT DE DIAGNÓSTICO Y MIGRACIÓN
-- Ejecutar en Supabase Dashboard → SQL Editor, en orden
-- ============================================================

-- ── PASO 1: Diagnóstico — ver qué tablas existen ────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('conos', 'categorias', 'items');

-- Si no aparecen "categorias" e "items", primero ejecuta el
-- database.sql completo (el que crea esas tablas).
-- Luego vuelve a correr este script desde el PASO 2.


-- ── PASO 2: Verificar que existe la categoría "Conos" ───────
SELECT * FROM categorias WHERE nombre = 'Conos';

-- Si no aparece nada, créala primero:
INSERT INTO categorias (nombre, icono, color, campos) VALUES
(
  'Conos', '🪟', '#0ea5e9',
  '[
    {"nombre":"tipo","label":"Tipo de cortina","tipo":"select","opciones":["roller","sunscreen","duo","blackout","screen"],"requerido":true},
    {"nombre":"color","label":"Color","tipo":"text","requerido":true},
    {"nombre":"medida","label":"Medida","tipo":"select","opciones":["15m","20m","25m","30m","40m","50m"],"requerido":true}
  ]'::jsonb
)
ON CONFLICT (nombre) DO NOTHING;


-- ── PASO 3: Ver tus 6 conos antiguos (confirmar que existen) ─
SELECT * FROM conos;


-- ── PASO 4: MIGRAR — copiar los 6 conos a la tabla items ────
-- Esto NO borra la tabla vieja, solo copia los datos
DO $$
DECLARE
  cat_id UUID;
BEGIN
  SELECT id INTO cat_id FROM categorias WHERE nombre = 'Conos';

  INSERT INTO items (categoria_id, estado, atributos, fecha_creacion, fecha_uso)
  SELECT
    cat_id,
    estado::text::estado_item,
    jsonb_build_object('tipo', tipo, 'color', color, 'medida', medida),
    fecha_creacion,
    fecha_uso
  FROM conos
  WHERE NOT EXISTS (
    -- Evita duplicar si corres el script dos veces
    SELECT 1 FROM items i
    WHERE i.fecha_creacion = conos.fecha_creacion
    AND i.atributos->>'tipo' = conos.tipo
  );
END $$;


-- ── PASO 5: Verificar que se migraron correctamente ──────────
SELECT
  i.id,
  c.nombre as categoria,
  i.atributos,
  i.estado,
  i.fecha_creacion
FROM items i
JOIN categorias c ON c.id = i.categoria_id
ORDER BY i.fecha_creacion DESC;

-- Deberías ver tus 6 conos aquí, con sus atributos como JSON.
