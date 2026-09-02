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
    const { data, error } = await supabase
      .from("categorias").select("*").order("nombre");
    if (error) throw error;
    // Las categorías cambian con poca frecuencia: se permite cache corta
    // por navegador/CDN para reducir carga sin servir datos desactualizados.
    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" },
    });
  } catch (e: any) {
    console.error("[GET /api/categorias]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuario = await getUsuarioActual();
    if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!puede(usuario.rol, "gestionarCategorias"))
      return NextResponse.json({ error: "No tienes permiso para crear categorías" }, { status: 403 });

    const supabase = createServiceClient();
    const { nombre, icono, color, campos } = await req.json();

    if (!nombre?.trim())
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    if (!campos?.length)
      return NextResponse.json({ error: "Agrega al menos un campo" }, { status: 400 });

    const { data, error } = await supabase
      .from("categorias")
      .insert([{ nombre: nombre.trim(), icono: icono || "/icon-192.png", color: color ?? "#0ea5e9", campos }])
      .select().single();
    if (error) throw error;

    await registrarAuditoria({
      usuario_id: usuario.id, usuario_nombre: usuario.nombre,
      accion: "crear", entidad: "categoria", entidad_id: data.id,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/categorias]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
