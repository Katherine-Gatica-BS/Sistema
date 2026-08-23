import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { getUsuarioActual } from "@/lib/current-user";
import { puede } from "@/lib/permissions";
import { registrarAuditoria } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!puede(usuario.rol, "gestionarCategorias"))
    return NextResponse.json({ error: "No tienes permiso para editar categorías" }, { status: 403 });

  const supabase = createServiceClient();
  const body = await req.json();
  const { data, error } = await supabase
    .from("categorias").update(body).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await registrarAuditoria({
    usuario_id: usuario.id, usuario_nombre: usuario.nombre,
    accion: "editar", entidad: "categoria", entidad_id: params.id,
  });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!puede(usuario.rol, "gestionarCategorias"))
    return NextResponse.json({ error: "No tienes permiso para eliminar categorías" }, { status: 403 });

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("items").select("id", { count: "exact", head: true })
    .eq("categoria_id", params.id);

  if ((count ?? 0) > 0)
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${count} producto(s) asociado(s)` },
      { status: 409 }
    );

  const { error } = await supabase.from("categorias").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await registrarAuditoria({
    usuario_id: usuario.id, usuario_nombre: usuario.nombre,
    accion: "eliminar", entidad: "categoria", entidad_id: params.id,
  });

  return NextResponse.json({ ok: true });
}
