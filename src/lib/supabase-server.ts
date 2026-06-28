import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Usar en Server Components, Route Handlers y Server Actions.
 * Lee la sesión desde las cookies del request.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
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
