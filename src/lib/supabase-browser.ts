import { createBrowserClient } from "@supabase/ssr";

/**
 * Usar en Client Components ("use client").
 * Gestiona la sesión en el navegador y refresca el token automáticamente.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
