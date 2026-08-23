import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { getUsuarioActual } from "@/lib/current-user";
import { puede } from "@/lib/permissions";

const BUCKET = "category-icons";
const MAX_BYTES = 3 * 1024 * 1024; // 3MB

async function ensureBucket(supabase: ReturnType<typeof createServiceClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some(b => b.name === BUCKET)) return;
  await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES });
}

// Sube el ícono de una categoría a Supabase Storage y devuelve su URL pública.
// Antes se guardaba como base64 directo en la base de datos, lo que duplicaba
// varios KB/MB por cada ítem al listar el inventario.
export async function POST(req: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!puede(usuario.rol, "gestionarCategorias"))
    return NextResponse.json({ error: "No tienes permiso para subir imágenes" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File))
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "La imagen no puede pesar más de 3MB" }, { status: 400 });

  const supabase = createServiceClient();
  await ensureBucket(supabase);

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
