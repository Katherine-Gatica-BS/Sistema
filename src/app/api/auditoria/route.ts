import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { getUsuarioActual } from "@/lib/current-user";

export async function GET() {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (usuario.rol !== "master")
    return NextResponse.json({ error: "Solo el usuario master puede ver la auditoría" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("auditoria")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function DELETE(req: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (usuario.rol !== "master")
    return NextResponse.json({ error: "Solo el usuario master puede eliminar registros de auditoría" }, { status: 403 });

  const { ids, all } = await req.json().catch(() => ({}));
  const supabase = createServiceClient();

  if (all === true) {
    // "neq" con un UUID imposible borra todas las filas sin necesitar un WHERE vacío.
    const { error } = await supabase.from("auditoria").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: "No se especificaron registros a eliminar" }, { status: 400 });

  const { error } = await supabase.from("auditoria").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
