/**
 * Generación de etiquetas ZPL para impresoras Zebra.
 *
 * Investigación sobre Zebra Designer Essentials 3 + ZPL:
 * - Zebra Designer Essentials 3 exporta/importa plantillas ZPL.
 * - La forma más directa de integrar una app web con Zebra es
 *   generar ZPL puro y enviarlo al spooler o descargarlo como .zpl.
 * - ZPL (Zebra Programming Language) se envía directo a la impresora
 *   vía USB/red — no necesita driver ni PDF intermedio.
 * - Para el QR en ZPL usamos el comando ^BQN (QR Code Native) que
 *   genera QR nativo de alta calidad en la impresora.
 *
 * Tamaño de etiqueta por defecto: 50mm x 30mm (configurable).
 * Resolución Zebra: 203 dpi (8 dots/mm).
 * 50mm = 400 dots, 30mm = 240 dots
 */

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://inventarioqr-pink.vercel.app";

export interface LabelData {
  id: string;
  titulo: string;        // primer atributo del ítem
  subtitulo?: string;    // segundo atributo (ej: color)
  categoria: string;
  atributos: Record<string, string>;
  campos?: { nombre: string; label: string }[];
}

/**
 * Genera ZPL para una etiqueta.
 * Dimensiones: 50mm x 30mm — ajustar ^PW y ^LL según rollo físico.
 */
export function generarZPL(item: LabelData, opts?: {
  anchoMm?: number;
  altoMm?: number;
}): string {
  const anchoMm = opts?.anchoMm ?? 100;
  const altoMm  = opts?.altoMm  ?? 50;
  const DOTS    = 8; // 203 dpi ≈ 8 dots/mm
  const PW      = Math.round(anchoMm * DOTS);
  const LL      = Math.round(altoMm  * DOTS);

  const scanUrl = `${APP_URL}/scan?id=${item.id}`;
  const idCorto = item.id.slice(0, 12).toUpperCase();

  // Truncar textos para que no se salgan
  const titulo    = item.titulo.slice(0, 22).toUpperCase();
  const subtitulo = (item.subtitulo ?? "").slice(0, 28);
  const catText   = item.categoria.slice(0, 20);

  // Líneas de atributos adicionales (máx 3)
  const attrLineas = Object.entries(item.atributos)
    .slice(0, 3)
    .map(([, v]) => v.slice(0, 28))
    .filter(Boolean);

  // ── Layout proporcional al tamaño configurado (nada de coordenadas fijas) ──
  const margin      = Math.round(Math.min(10, PW * 0.02));
  const qrAreaW     = Math.round(Math.min(PW * 0.42, LL - margin * 2)); // el QR es cuadrado
  const qrMagnif    = Math.max(1, Math.min(10, Math.round((qrAreaW / DOTS) / 6.25))); // mag 4 ≈ 25mm
  const dividerX    = margin + qrAreaW + margin;
  const textX       = dividerX + margin + 8;
  const textW       = PW - textX - margin;

  const fontCat     = Math.max(10, Math.round(LL * 0.06));
  const fontTitulo  = Math.max(14, Math.round(LL * 0.09));
  const fontSub     = Math.max(11, Math.round(LL * 0.07));
  const fontAttr    = Math.max(10, Math.round(LL * 0.06));
  const fontId      = Math.max(9,  Math.round(LL * 0.05));

  const yCat     = margin;
  const yTitulo  = yCat + fontCat + 6;
  const ySub     = yTitulo + fontTitulo + 4;
  const yAttrs0  = ySub + (subtitulo ? fontSub + 6 : 0);

  return [
    "^XA",
    `^PW${PW}`,        // ancho del papel
    `^LL${LL}`,        // largo de la etiqueta
    "^LH0,0",          // home label
    "^CI28",           // UTF-8

    // QR Code nativo — tamaño proporcional al área calculada
    `^FO${margin},${margin}`,
    `^BQN,2,${qrMagnif},M,7`,
    `^FDMA,${scanUrl}^FS`,

    // Línea divisoria vertical — posicionada según el ancho real del QR
    `^FO${dividerX},${margin}^GB2,${LL - margin * 2},2^FS`,

    // Categoría — pequeño
    `^FO${textX},${yCat}^A0N,${fontCat},${fontCat}^FB${textW},1,0,L^FD${catText}^FS`,

    // Título — grande y negrita
    `^FO${textX},${yTitulo}^A0N,${fontTitulo},${fontTitulo}^FB${textW},1,0,L^FD${titulo}^FS`,

    // Subtítulo
    ...(subtitulo ? [`^FO${textX},${ySub}^A0N,${fontSub},${fontSub}^FB${textW},1,0,L^FD${subtitulo}^FS`] : []),

    // Atributos adicionales
    ...attrLineas.map((v, i) => `^FO${textX},${yAttrs0 + i * (fontAttr + 4)}^A0N,${fontAttr},${fontAttr}^FB${textW},1,0,L^FD${v}^FS`),

    // ID corto en la parte inferior
    `^FO${textX},${LL - fontId - margin}^A0N,${fontId},${fontId}^FD#${idCorto}^FS`,

    "^XZ",
  ].join("\n");
}

/**
 * Genera un batch de ZPL para múltiples ítems.
 * Cada etiqueta es un bloque ^XA...^XZ independiente.
 */
export function generarZPLBatch(items: LabelData[], opts?: { anchoMm?: number; altoMm?: number }): string {
  return items.map(item => generarZPL(item, opts)).join("\n\n");
}

/**
 * Descarga el ZPL como archivo .zpl
 * El usuario puede abrirlo con Zebra Designer o enviarlo directo a la impresora.
 */
export function descargarZPL(zpl: string, filename = "etiquetas.zpl") {
  const blob = new Blob([zpl], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Enviar ZPL directo a impresora Zebra por red (si está en la misma red local).
 * Requiere que la impresora tenga IP asignada y puerto 9100 abierto.
 * Nota: esto solo funciona en entornos donde el navegador pueda hacer
 * fetch a IPs locales (algunas configs corporativas lo bloquean).
 */
export async function enviarZPLPorRed(zpl: string, ipImpresora: string): Promise<boolean> {
  try {
    await fetch(`http://${ipImpresora}:9100`, {
      method: "POST",
      body: zpl,
      mode: "no-cors",
    });
    return true;
  } catch {
    return false;
  }
}
