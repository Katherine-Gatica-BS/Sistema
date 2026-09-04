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

  // ── Layout proporcional al tamaño configurado ──
  const margin      = Math.round(Math.min(16, PW * 0.03));
  const qrX         = 60;  // QR a ~7.5mm del borde izquierdo
  const qrAreaW     = 280; // QR nativo Zebra mag 7 es ~35mm (280 dots)
  const qrY         = Math.max(margin, Math.round((LL - qrAreaW) / 2));

  const dividerX    = 348; // Divisor vertical en 43.5mm
  const textX       = 366; // El texto empieza en 45.75mm
  const offsetVal   = 145; // Columna de valores empieza en 45.75mm + 18.1mm = 63.85mm (espacio amplio tras COLOR)
  const maxValWidth = PW - margin - (textX + offsetVal); // ~273 dots disponibles para valores

  const fontTituloH = 26, fontTituloW = 20;
  const fontNormH   = 22, fontNormW   = 16;
  const fontDestH   = 30, fontDestW   = 22; // Tamaño destacado legible sin invadir espacio horizontal
  const fontMetaH   = 18, fontMetaW   = 14;
  const fontCodH    = 26, fontCodW    = 20;

  const gapTitulo = 10;
  const gapMeta   = 10;

  const filasConLayout = filas.map(f => {
    const lblUpper = f.label.trim().toUpperCase();
    const destacada = lblUpper === "COLOR" || lblUpper === "ALTO" || lblUpper.startsWith("COLOR");
    const h = destacada ? fontDestH : fontNormH;
    const w = destacada ? fontDestW : fontNormW;
    const valStr = String(f.value).slice(0, 25);

    // offset dinámico para que etiquetas largas jamás toquen el valor
    const valOffsetFila = Math.max(offsetVal, f.label.trim().length * w + 16);

    // Ajuste dinámico del ancho de fuente para valores largos (auto-escalado limpio)
    const maxWForLen = Math.floor((PW - margin - (textX + valOffsetFila)) / Math.max(1, valStr.length));
    const fontValueW = Math.max(10, Math.min(w, maxWForLen));

    const altoFila = h + (destacada ? 8 : 6);
    return { ...f, h, w, fontValueW, valStr, valOffsetFila, altoFila };
  });

  // Altura total del bloque de texto, para poder centrarlo verticalmente.
  const alturaContenido =
    fontTituloH + gapTitulo +
    filasConLayout.reduce((total, fila) => total + fila.altoFila, 0) +
    fontMetaH + gapMeta +
    fontCodH;

  const startY = Math.max(margin, Math.round((LL - alturaContenido) / 2));

  let y = startY;
  const yTitulo = y; y += fontTituloH + gapTitulo;
  const yFilas  = filasConLayout.map(fila => { const yy = y; y += fila.altoFila; return yy; });
  const yMeta   = y; y += fontMetaH + gapMeta;
  const yCodigo = y;

  return [
    "^XA",
    `^PW${PW}`,        // ancho del papel
    `^LL${LL}`,        // largo de la etiqueta
    "^LH0,0",          // home label
    "^CI28",           // UTF-8

    // QR Code nativo — centrado verticalmente en el área del QR
    `^FO${qrX},${qrY}`,
    `^BQN,2,7,M,7`,
    `^FDMA,${scanUrl}^FS`,

    // Línea divisoria vertical
    `^FO${dividerX},${margin}^GB2,${LL - margin * 2},2^FS`,

    // Título — nombre de categoría
    `^FO${textX},${yTitulo}^A0N,${fontTituloH},${fontTituloW}^FD${escaparZPL(catText)}^FS`,

    // Filas de atributos: etiqueta + valor con separación amplia garantizada
    ...filasConLayout.flatMap((f, i) => [
      `^FO${textX},${yFilas[i]}^A0N,${f.h},${f.w}^FD${escaparZPL(f.label)}^FS`,
      `^FO${textX + f.valOffsetFila},${yFilas[i]}^A0N,${f.h},${f.fontValueW}^FD${escaparZPL(f.valStr)}^FS`,
    ]),

    // Fecha de creación
    `^FO${textX},${yMeta}^A0N,${fontMetaH},${fontMetaW}^FD${escaparZPL(meta)}^FS`,

    // Código de producto
    `^FO${textX},${yCodigo}^A0N,${fontCodH},${fontCodW}^FD${escaparZPL(codigo)}^FS`,

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
