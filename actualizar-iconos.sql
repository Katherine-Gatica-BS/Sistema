-- Actualizar íconos de las categorías con imágenes personalizadas
UPDATE categorias SET icono = '/cat-conos.png'   WHERE nombre = 'Conos';
UPDATE categorias SET icono = '/cat-retazos.png' WHERE nombre = 'Retazos';
UPDATE categorias SET icono = '/cat-barras.png'  WHERE nombre = 'Barras';

-- Agregar campo "zona" a todas las categorías si no lo tienen
UPDATE categorias
SET campos = campos || '[{"nombre":"zona","label":"Zona","tipo":"select","opciones":["Zona A","Zona B","Zona C","Zona D"],"requerido":false}]'::jsonb
WHERE NOT (campos::text LIKE '%"nombre":"zona"%');

-- Verificar resultado
SELECT nombre, icono, jsonb_array_length(campos) AS num_campos FROM categorias;
