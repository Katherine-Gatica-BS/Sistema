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
  categoria: string;
  filas: { label: string; value: string }[]; // atributos formateados como en la vista previa
  fechaCreacion: string; // ya formateada para mostrar, ej. "1/9/2026"
  codigo: string;        // código de producto (ver product-code.ts)
}

/**
 * Genera ZPL para una etiqueta.
 * El bloque de contenido (título, filas, meta, código) se centra
 * verticalmente dentro de la etiqueta para que no quede pegado arriba.
 */
export function generarZPL(item: LabelData, opts?: {
  anchoMm?: number;
  altoMm?: number;
}): string {
  const anchoMm = opts?.anchoMm ?? 100;
  const altoMm  = opts?.altoMm  ?? 55;
  const DOTS    = 8; // 203 dpi ≈ 8 dots/mm
  const PW      = Math.round(anchoMm * DOTS);
  const LL      = Math.round(altoMm  * DOTS);

  const scanUrl = `${APP_URL}/scan?id=${item.id}`;

  const catText  = item.categoria.slice(0, 22).toUpperCase();
  const filas    = item.filas.slice(0, 6).map(f => ({
    label: f.label.slice(0, 12).toUpperCase(),
    value: String(f.value).slice(0, 21),
  }));
  const meta   = `Creado: ${item.fechaCreacion}`;
  const codigo = item.codigo;
  const escaparZPL = (texto: string) => texto.replace(/[\^~]/g, " ");

  // ── Layout proporcional al tamaño configurado (nada de coordenadas fijas) ──
  const margin      = Math.round(Math.min(10, PW * 0.02));
  const qrX         = margin + Math.round(DOTS * 2);
  const qrAreaW     = Math.round(Math.min(PW * 0.42, LL - margin * 2)); // el QR es cuadrado
  const qrMagnif    = Math.max(1, Math.min(10, Math.round((qrAreaW / DOTS) / 6.25))); // mag 4 ≈ 25mm
  const dividerX    = margin + qrAreaW + margin;
  const textX       = dividerX + margin + 8;
  const textW       = PW - textX - margin;
  const labelW      = Math.round(textW * 0.38);

  const fontTitulo = Math.max(10, Math.round(LL * 0.065));
  const fontFila   = Math.max(10, Math.round(LL * 0.065));
  const fontDestacada = Math.max(16, Math.round(LL * 0.11));
  const fontMeta   = Math.max(9,  Math.round(LL * 0.055));
  const fontCodigo = Math.max(16, Math.round(LL * 0.09));

  const gapTitulo = Math.round(fontTitulo * 0.35);
  const gapMeta   = Math.round(fontMeta * 0.4);
  const filasConLayout = filas.map(f => {
    const lblUpper = f.label.trim().toUpperCase();
    const destacada = lblUpper === "COLOR" || lblUpper === "ALTO" || lblUpper.startsWith("COLOR");
    const fontLabel = destacada ? fontDestacada : fontFila;
    const fontValue = destacada ? fontDestacada : fontFila;
    return { ...f, fontLabel, fontValue, alto: Math.max(fontLabel, fontValue) + Math.round(fontLabel * 0.3) };
  });

  // Altura total del bloque de texto, para poder centrarlo verticalmente.
  const alturaContenido =
    fontTitulo + gapTitulo +
    filasConLayout.reduce((total, fila) => total + fila.alto, 0) +
    fontMeta + gapMeta +
    fontCodigo;

  const areaDisponible = LL - margin * 2;
  const startY = margin + Math.max(0, Math.round((areaDisponible - alturaContenido) / 2));

  let y = startY;
  const yTitulo = y; y += fontTitulo + gapTitulo;
  const yFilas  = filasConLayout.map(fila => { const yy = y; y += fila.alto; return yy; });
  const yMeta   = y; y += fontMeta + gapMeta;
  const yCodigo = y;

  return [
    "^XA",
    `^PW${PW}`,        // ancho del papel
    `^LL${LL}`,        // largo de la etiqueta
    "^LH0,0",          // home label
    "^CI28",           // UTF-8

    // QR Code nativo — centrado verticalmente en el área del QR
    `^FO${qrX},${Math.max(margin, Math.round((LL - qrAreaW) / 2))}`,
    `^BQN,2,${qrMagnif},M,7`,
    `^FDMA,${scanUrl}^FS`,

    // Línea divisoria vertical — posicionada según el ancho real del QR
    `^FO${dividerX},${margin}^GB2,${LL - margin * 2},2^FS`,

    // Título — nombre de categoría en el tamaño normal de las filas
    `^FO${textX},${yTitulo}^A0N,${fontTitulo},${fontTitulo}^FB${textW},1,0,L^FD${escaparZPL(catText)}^FS`,

    // Filas de atributos: etiqueta + valor en dos columnas
    ...filasConLayout.flatMap((f, i) => [
      `^FO${textX},${yFilas[i]}^A0N,${f.fontLabel},${f.fontLabel}^FB${labelW},1,0,L^FD${escaparZPL(f.label)}^FS`,
      `^FO${textX + labelW},${yFilas[i]}^A0N,${f.fontValue},${f.fontValue}^FB${textW - labelW},1,0,L^FD${escaparZPL(f.value)}^FS`,
    ]),

    // Fecha de creación
    `^FO${textX},${yMeta}^A0N,${fontMeta},${fontMeta}^FB${textW},1,0,L^FD${escaparZPL(meta)}^FS`,

    // Código de producto
    `^FO${textX},${yCodigo}^A0N,${fontCodigo},${fontCodigo}^FB${textW},1,0,L^FD${escaparZPL(codigo)}^FS`,

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
