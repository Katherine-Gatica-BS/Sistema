import { createServiceClient } from "@/lib/supabase-service";

interface RegistroAuditoria {
  usuario_id: string | null;
  usuario_nombre: string;
  accion: "crear" | "editar" | "eliminar" | "marcar_usado";
  entidad: "item" | "categoria" | "usuario";
  entidad_id?: string | null;
  detalle?: Record<string, unknown>;
}

/** Inserta un registro de auditoría. No lanza si falla — nunca debe bloquear la operación principal. */
export async function registrarAuditoria(registro: RegistroAuditoria) {
  try {
    const supabase = createServiceClient();
    await supabase.from("auditoria").insert([registro]);
  } catch (e) {
    console.error("[auditoria] No se pudo registrar:", e);
  }
}
