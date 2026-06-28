import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// GET /api/cones — lista todos los conos (público)
export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("conos")
    .select("*")
    .order("fecha_creacion", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/cones — crea un nuevo cono (requiere auth)
export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autorizado. Debes iniciar sesión." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { tipo, color, medida } = body;

  if (!tipo || !color || !medida) {
    return NextResponse.json(
      { error: "Faltan campos: tipo, color, medida" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("conos")
    .insert([{ tipo, color, medida }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
