export function normalizeCategoryIcon(icono?: string | null): string | null {
  const raw = (icono ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:") || raw.startsWith("/")) {
    return raw;
  }

  const normalized = raw.replace(/^\.?\//, "");
  if (/\.(png|jpg|jpeg|svg|webp|gif|ico)(\?[^#]*)?(#[^]*)?$/i.test(normalized) || normalized.startsWith("cat-")) {
    return `/${normalized}`;
  }

  // También acepta rutas relativas sin prefijo /, por ejemplo: "cat-barras.png"
  if (/^(?:[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|svg|webp|gif|ico))$/i.test(normalized)) {
    return `/${normalized}`;
  }

  return null;
}
