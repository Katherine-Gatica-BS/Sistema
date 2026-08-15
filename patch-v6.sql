-- ============================================================
-- PATCH v6 — Ejecutar en Supabase SQL Editor
-- Necesario para habilitar el escaneo público sin login
-- ============================================================

-- Permitir UPDATE público en items para el endpoint de escaneo
-- (La seguridad real la da el SUPABASE_SERVICE_ROLE_KEY en el servidor)
-- Si prefieres no usar service role, esta política permite el update anon:
DROP POLICY IF EXISTS "scan_publico" ON items;
CREATE POLICY "scan_publico"
  ON items FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Verificar políticas activas
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'items'
ORDER BY cmd;

-- ============================================================
-- IMPORTANTE: Variable de entorno en Vercel
-- ============================================================
-- Para máxima seguridad, agrega en Vercel → Settings → Environment Variables:
--
--   SUPABASE_SERVICE_ROLE_KEY = <tu service role key>
--
-- Encuéntrala en: Supabase → Settings → API → service_role (secret)
--
-- Esta clave NUNCA debe tener prefijo NEXT_PUBLIC_ — es solo servidor.
-- Permite que el endpoint /api/public/scan opere sin RLS.
-- ============================================================
