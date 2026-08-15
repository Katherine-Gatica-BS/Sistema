/**
 * Cliente Supabase para API Routes — no requiere sesión de usuario.
 * 
 * En producción: agregar SUPABASE_SERVICE_ROLE_KEY en Vercel para
 * bypasear RLS completamente.
 * 
 * En desarrollo local: usa NEXT_PUBLIC_SUPABASE_ANON_KEY — requiere
 * que las políticas RLS estén configuradas como "acceso_total" (ver patch-final.sql).
 */
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY   // Vercel: variable privada
             ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Local: anon key

  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno de Supabase. " +
      "Verifica NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
