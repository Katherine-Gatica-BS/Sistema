import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("items").select("*, categoria:categorias(*)")
    .eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const { data: item } = await supabase
    .from("items").select("id, estado, cantidad").eq("id", params.id).single();

  if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  if (item.estado === "usado" && (item.cantidad ?? 0) === 0)
    return NextResponse.json({ error: "Ya fue marcado como usado", alreadyUsed: true }, { status: 409 });

  const { data, error } = await supabase
    .from("items")
    .update({ estado: "usado", fecha_uso: new Date().toISOString() })
    .eq("id", params.id)
    .select("*, categoria:categorias(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("items").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
