// ─── Types ────────────────────────────────────────────────────────────────────

export type ConoEstado = "disponible" | "uso";

export interface Cono {
  id: string;
  tipo: string;
  color: string;
  medida: string;
  estado: "disponible" | "usado";
  fecha_creacion: string;
  fecha_uso: string | null;
}

export type ConoInsert = Omit<Cono, "id" | "fecha_creacion" | "fecha_uso" | "estado">;
