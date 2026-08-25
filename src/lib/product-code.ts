import { Item } from "@/lib/supabase";

export function generateProductCode(item: Pick<Item, "id" | "categoria" | "atributos" | "fecha_creacion">): string {
  const typeRaw = item.categoria?.nombre ?? "GEN";
  const type = typeRaw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase() || "GEN";

  const zoneEntry = Object.entries(item.atributos ?? {}).find(([key]) => /zona|area|ubicacion/i.test(key));
  const zoneRaw = (zoneEntry?.[1] ?? "GEN").toString();
  const zone = zoneRaw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase() || "GEN";

  const created = new Date(item.fecha_creacion);
  const fecha = `${String(created.getDate()).padStart(2, "0")}${String(created.getMonth() + 1).padStart(2, "0")}${String(created.getFullYear()).slice(-2)}`;
  const suffix = String(item.id).replace(/[^A-Za-z0-9]/g, "").slice(-4).toUpperCase().padEnd(4, "0");

  return `${type}-${zone}-${fecha}-${suffix}`;
}
