import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: { [key: string]: any };
};

/**
 * Middleware de sesión.
 * - Refresca el token en cada request.
 * - /scan es PÚBLICO — no requiere autenticación.
 * - Solo /login redirige al home si ya hay sesión.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?? process.env.SUPABASE_URL
    ?? process.env.supabase_url;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.supabase_anon_key;

  if (!url || !anonKey) {
    throw new Error("Faltan variables de entorno de Supabase en middleware. Revisa SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL y SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refrescar sesión (necesario para mantener token activo)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Si ya está logueado e intenta ir al login → home
  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // /scan es completamente público — no redirigir nunca
  // Todo lo demás pasa sin restricción (el inventario se protege desde el componente)
  return supabaseResponse;
}
