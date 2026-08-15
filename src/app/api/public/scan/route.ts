/**
 * API pública de escaneo — sin autenticación.
 * Usa SUPABASE_SERVICE_ROLE_KEY (variable de entorno privada, solo servidor).
 * Esta clave NUNCA se expone al cliente — está prefijada sin NEXT_PUBLIC_.
 *
 * Descuenta 1 unidad de cantidad. Cuando llega a 0, cambia estado a "usado".
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Service role: acceso total sin RLS. Si no está definida, cae a anon key.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Leer ítem actual
  const { data: item, error: fetchErr } = await supabase
    .from("items")
    .select("id, estado, cantidad, atributos, categoria:categorias(*)")
    .eq("id", id)
    .single();

  if (fetchErr || !item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  if (item.estado === "usado" && (item.cantidad ?? 0) === 0) {
    return NextResponse.json(
      { error: "Stock agotado — este ítem ya fue completamente descontado", alreadyUsed: true, item },
      { status: 409 }
    );
  }

  const cantidadActual  = item.cantidad ?? 1;
  const nuevaCantidad   = Math.max(0, cantidadActual - 1);
  const nuevoEstado     = nuevaCantidad === 0 ? "usado" : "disponible";

  const { data, error } = await supabase
    .from("items")
    .update({
      cantidad:  nuevaCantidad,
      estado:    nuevoEstado,
      fecha_uso: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, categoria:categorias(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...data,
    cantidadAnterior: cantidadActual,
    unidadDescontada: true,
  });
}
