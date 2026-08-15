-- ============================================================
-- FIX DEFINITIVO — ejecutar en Supabase SQL Editor
-- ============================================================

-- PASO 1: Verificar qué hay en items ahora mismo
SELECT id, tipo, color, estado FROM items LIMIT 10;

-- PASO 2: Si los registros existen pero el estado tiene un valor raro,
-- normalízalo todo a 'disponible'
UPDATE items
SET estado = 'disponible'
WHERE estado NOT IN ('disponible', 'usado');

-- PASO 3: Verifica el resultado final
SELECT
  i.id,
  i.tipo,
  i.color,
  i.estado,
  c.nombre AS categoria
FROM items i
LEFT JOIN categorias c ON c.id = i.categoria_id
ORDER BY i.fecha_creacion DESC;

-- Si el PASO 3 muestra tus 6 conos → el problema era el bug en el código
-- (ya está corregido en la nueva versión).

-- Si el PASO 3 muestra 0 filas → los conos no se migraron.
-- En ese caso ejecuta esto para migrarlos ahora:
/*
INSERT INTO items (categoria_id, estado, tipo, color, alto, ancho, cantidad, fecha_creacion, fecha_uso)
SELECT
  (SELECT id FROM categorias WHERE nombre = 'Conos'),
  'disponible',
  COALESCE(tipo, 'sin tipo'),
  COALESCE(color, 'sin color'),
  COALESCE(medida, ''),
  '',
  1,
  fecha_creacion,
  fecha_uso
FROM conos;
*/
