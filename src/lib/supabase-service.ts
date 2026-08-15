/**
 * Cliente Supabase para API Routes — no requiere sesión de usuario.
 * 
 * En producción: agregar SUPABASE_SERVICE_ROLE_KEY en Vercel para
 * bypasear RLS completamente.
 * 
 * En desarrollo local: usa SUPABASE_ANON_KEY — requiere
 * que las políticas RLS estén configuradas como "acceso_total" (ver patch-final.sql).
 */
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.SUPABASE_URL
    ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    ?? process.env.supabase_url;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.supabase_anon_key
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno de Supabase. " +
      "Verifica SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL y SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local (prioridad: SUPABASE_*)"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
