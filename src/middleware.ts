import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase-middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Ejecutar el middleware en todas las rutas EXCEPTO:
     * - _next/static  (archivos estáticos de Next.js)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico, íconos, manifest
     * - API routes de autenticación
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-.*|manifest.json|register-sw.js|sw.js).*)",
  ],
};
