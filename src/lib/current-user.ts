import { createClient as createServerClient } from "@/lib/supabase-server";
import type { Rol } from "@/lib/permissions";

export interface UsuarioActual {
  id: string;
  nombre: string;
  rol: Rol;
}

/** Usuario autenticado (desde cookies) + su perfil/rol. Null si no hay sesión o no tiene perfil. */
export async function getUsuarioActual(): Promise<UsuarioActual | null> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Se consulta con el cliente autenticado del propio usuario (no el de service_role):
  // la política "perfiles_select_propio" ya permite leer su propia fila sin depender
  // de que SUPABASE_SERVICE_ROLE_KEY esté configurada.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;
  return { id: user.id, nombre: perfil.nombre, rol: perfil.rol as Rol };
}
