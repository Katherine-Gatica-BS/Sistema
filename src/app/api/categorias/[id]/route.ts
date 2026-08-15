import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { data, error } = await supabase
    .from("categorias").update(body).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
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
  return NextResponse.json({ ok: true });
}
