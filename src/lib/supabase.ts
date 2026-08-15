export type ItemEstado = "disponible" | "usado";

export interface CampoSchema {
  nombre: string;      // key interno, ej: "color"
  label: string;       // texto visible, ej: "Color"
  tipo: "text" | "number" | "select";
  opciones?: string[]; // solo para tipo "select"
  requerido: boolean;
}

export interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  campos: CampoSchema[];
  fecha_creacion: string;
}

export interface Item {
  id: string;
  categoria_id: string;
  categoria?: Categoria;
  estado: ItemEstado;
  atributos: Record<string, string>;  // valores dinámicos según campos
  cantidad: number;
  fecha_creacion: string;
  fecha_uso: string | null;
}
