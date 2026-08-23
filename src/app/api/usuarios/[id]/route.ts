import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { getUsuarioActual } from "@/lib/current-user";
import { registrarAuditoria } from "@/lib/audit";
import { ROLES, type Rol } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (usuario.rol !== "master")
    return NextResponse.json({ error: "Solo el usuario master puede editar usuarios" }, { status: 403 });

  const { rol } = await req.json().catch(() => ({}));
  if (!ROLES.some(r => r.valor === rol))
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  if (params.id === usuario.id)
    return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("perfiles").update({ rol: rol as Rol }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await registrarAuditoria({
    usuario_id: usuario.id, usuario_nombre: usuario.nombre,
    accion: "editar", entidad: "usuario", entidad_id: params.id,
    detalle: { nuevoRol: rol },
  });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (usuario.rol !== "master")
    return NextResponse.json({ error: "Solo el usuario master puede eliminar usuarios" }, { status: 403 });

  if (params.id === usuario.id)
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(params.id);
  if (error) {
    const msg = error.message?.includes("Bearer token")
      ? "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor — sin esa clave no se pueden eliminar usuarios."
      : (error.message ?? "No se pudo eliminar el usuario");
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // El perfil se elimina en cascada al borrar el usuario de Auth.
  await registrarAuditoria({
    usuario_id: usuario.id, usuario_nombre: usuario.nombre,
    accion: "eliminar", entidad: "usuario", entidad_id: params.id,
  });

  return NextResponse.json({ ok: true });
}
