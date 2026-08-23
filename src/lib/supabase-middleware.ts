import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { rutaPorDefecto, type Rol } from "@/lib/permissions";

type CookieToSet = {
  name: string;
  value: string;
  options?: { [key: string]: any };
};

/**
 * Middleware de sesión.
 * - Refresca el token en cada request.
 * - /scan y /api/public/* son PÚBLICOS — no requieren autenticación.
 * - El resto de páginas requiere sesión, y algunas requieren un rol específico.
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

  // Las rutas de API manejan su propia autenticación/autorización (ver src/lib/current-user.ts).
  if (pathname.startsWith("/api/")) return supabaseResponse;

  // /scan es completamente público — no requiere sesión.
  if (pathname.startsWith("/scan")) return supabaseResponse;

  // El enlace de recuperación de contraseña crea su propia sesión temporal en el cliente
  // (vía hash de URL) — el middleware no la ve todavía en la primera carga.
  if (pathname.startsWith("/reset-password")) return supabaseResponse;

  // Si ya está logueado e intenta ir al login → home
  if (pathname === "/login" && user) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    return NextResponse.redirect(home);
  }
  if (pathname === "/login") return supabaseResponse;

  // Todo lo demás requiere sesión.
  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(login);
  }

  // Rol del usuario — se necesita para restringir páginas.
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  const rol = (perfil?.rol ?? null) as Rol | null;

  // "scanner" solo puede usar el escáner.
  if (rol === "scanner" && !pathname.startsWith("/scan")) {
    const destino = request.nextUrl.clone();
    destino.pathname = rutaPorDefecto(rol);
    return NextResponse.redirect(destino);
  }

  // Gestión de usuarios y auditoría — solo "master".
  if ((pathname.startsWith("/usuarios") || pathname.startsWith("/auditoria")) && rol !== "master") {
    const destino = request.nextUrl.clone();
    destino.pathname = rutaPorDefecto(rol);
    return NextResponse.redirect(destino);
  }

  return supabaseResponse;
}
