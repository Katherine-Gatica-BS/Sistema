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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
