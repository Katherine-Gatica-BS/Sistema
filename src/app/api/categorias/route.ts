import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("categorias").select("*").order("nombre");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    console.error("[GET /api/categorias]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/categorias]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
