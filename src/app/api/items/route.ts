import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("items")
      .select("*, categoria:categorias(*)")
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
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/items]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
