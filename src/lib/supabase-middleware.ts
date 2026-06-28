import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware de autenticación.
 * - Refresca el token de sesión en cada request.
 * - Redirige a /login si el usuario intenta acceder a /scan sin sesión,
 *   guardando la URL original para volver después del login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca la sesión (no usar getUser() aquí — rompe el token refresh)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Rutas protegidas: /scan
  const isProtected = pathname.startsWith("/scan");

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Guardar la URL original para redirigir después del login
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Si ya está logueado e intenta ir al login, redirigir al home
  if (pathname === "/login" && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}
