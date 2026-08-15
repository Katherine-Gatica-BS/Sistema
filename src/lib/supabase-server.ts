import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = {
  name: string;
  value: string;
  options?: { [key: string]: any };
};

/**
 * Usar en Server Components, Route Handlers y Server Actions.
 * Lee la sesión desde las cookies del request.
 */
export function createClient() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?? process.env.SUPABASE_URL
    ?? process.env.supabase_url;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.supabase_anon_key;

  if (!url || !anonKey) {
    throw new Error("Faltan variables de entorno de Supabase para el servidor. Revisa SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL y SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // En Server Components el set no tiene efecto — es OK.
          }
        },
      },
    }
  );
}
