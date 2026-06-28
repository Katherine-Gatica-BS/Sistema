import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// PATCH /api/cones/[id] — marca el cono como "usado"
// Requiere sesión activa; Supabase RLS también lo valida en DB.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { id } = params;

  // ── 1. Verificar sesión ───────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autorizado. Debes iniciar sesión." },
      { status: 401 }
    );
  }

  // ── 2. Buscar el cono ─────────────────────────────────────────────────────
  const { data: cono, error: fetchError } = await supabase
    .from("conos")
    .select("id, estado")
    .eq("id", id)
    .single();

  if (fetchError || !cono) {
    return NextResponse.json({ error: "Cono no encontrado" }, { status: 404 });
  }

  // ── 3. Validar estado actual ──────────────────────────────────────────────
  if (cono.estado === "usado") {
    return NextResponse.json(
      { error: "Este cono ya fue marcado como usado", alreadyUsed: true },
      { status: 409 }
    );
  }

  // ── 4. Actualizar ─────────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("conos")
    .update({ estado: "usado", fecha_uso: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
