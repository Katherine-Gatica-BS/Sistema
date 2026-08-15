import { createBrowserClient } from "@supabase/ssr";

/**
 * Usar en Client Components ("use client").
 * Gestiona la sesión en el navegador y refresca el token automáticamente.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?? process.env.SUPABASE_URL
    ?? process.env.supabase_url
    ?? "";

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.supabase_anon_key
    ?? "";

  if (!url || !anonKey) {
    throw new Error("Faltan variables de entorno de Supabase para el cliente. Usa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  }

  return createBrowserClient(url, anonKey);
}
