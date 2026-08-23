import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { getUsuarioActual } from "@/lib/current-user";
import { puede } from "@/lib/permissions";
import { registrarAuditoria } from "@/lib/audit";

export async function GET() {
  try {
    const usuario = await getUsuarioActual();
    if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const supabase = createServiceClient();
    // No se une "categoria" aquí: el cliente ya trae /api/categorias por su cuenta.
    // Unirla duplicaría el ícono (a veces base64, varios KB/MB) por cada ítem.
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("fecha_creacion", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    console.error("[GET /api/items]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuario = await getUsuarioActual();
    if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!puede(usuario.rol, "gestionarItems"))
      return NextResponse.json({ error: "No tienes permiso para crear ítems" }, { status: 403 });

    const supabase = createServiceClient();
    const { categoria_id, atributos, cantidad } = await req.json();

    if (!categoria_id || !atributos)
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });

    const { data, error } = await supabase
      .from("items")
      .insert([{ categoria_id, atributos, cantidad: Number(cantidad) || 1 }])
      .select("*, categoria:categorias(*)")
      .single();
    if (error) throw error;

    await registrarAuditoria({
      usuario_id: usuario.id, usuario_nombre: usuario.nombre,
      accion: "crear", entidad: "item", entidad_id: data.id,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/items]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
