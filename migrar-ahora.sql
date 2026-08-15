-- Copia TODO esto y pégalo en Supabase → SQL Editor → Run

-- 1. Crea la categoría Conos si no existe
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

-- 2. Copia tus conos viejos a la tabla nueva
INSERT INTO items (categoria_id, estado, atributos, fecha_creacion, fecha_uso)
SELECT
  (SELECT id FROM categorias WHERE nombre = 'Conos'),
  estado::text::estado_item,
  jsonb_build_object('tipo', tipo, 'color', color, 'medida', medida),
  fecha_creacion,
  fecha_uso
FROM conos;

-- 3. Confirma que se migraron
SELECT COUNT(*) AS total_migrados FROM items;
