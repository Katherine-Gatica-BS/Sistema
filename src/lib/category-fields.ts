import { CampoSchema } from "@/lib/supabase";

// Toda categoría debe identificar Tipo y Zona por defecto — se agregan siempre.
export const CAMPOS_BASE: CampoSchema[] = [
  { nombre: "tipo", label: "Tipo", tipo: "text", requerido: true },
  { nombre: "zona", label: "Zona", tipo: "text", requerido: true },
];

export function esCampoBase(nombre: string): boolean {
  return CAMPOS_BASE.some(c => c.nombre === nombre);
}

// Quita campos repetidos (misma clave "nombre"), conservando la primera aparición.
export function dedupeCampos(campos: CampoSchema[] | undefined | null): CampoSchema[] {
  const vistos = new Set<string>();
  const resultado: CampoSchema[] = [];
  for (const campo of campos ?? []) {
    if (!campo?.nombre || vistos.has(campo.nombre)) continue;
    vistos.add(campo.nombre);
    resultado.push(campo);
  }
  return resultado;
}

// Garantiza que Tipo y Zona siempre estén presentes, sin duplicados.
export function conCamposBase(campos: CampoSchema[] | undefined | null): CampoSchema[] {
  const limpios = dedupeCampos(campos);
  const existentes = new Set(limpios.map(c => c.nombre));
  const faltantes = CAMPOS_BASE.filter(base => !existentes.has(base.nombre));
  return [...faltantes, ...limpios];
}
