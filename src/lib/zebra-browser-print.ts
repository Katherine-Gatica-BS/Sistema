/**
 * Integración con Zebra Browser Print
 * =====================================
 * Zebra Browser Print es un servicio local gratuito de Zebra que expone
 * una API REST en localhost para enviar ZPL directo a impresoras Zebra.
 *
 * Descarga: https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html
 *
 * Puerto por defecto: 9100 (HTTP) o 9101 (HTTPS)
 * El servicio corre en segundo plano en Windows como tarea del sistema.
 */

const ZBP_HTTP  = "http://localhost:9100";
const ZBP_HTTPS = "https://localhost:9101";

export interface ZebraPrinter {
  name: string;
  uid: string;
  connection: string;
  deviceType: string;
  version: string;
  provider: string;
  manufacturer: string;
}

/**
 * Detecta si Zebra Browser Print está corriendo.
 * Intenta HTTP primero, luego HTTPS.
 * Retorna la URL base si está disponible, null si no.
 */
export async function detectarZebraBrowserPrint(): Promise<string | null> {
  for (const base of [ZBP_HTTP, ZBP_HTTPS]) {
    try {
      const res = await fetch(`${base}/available`, {
        method: "GET",
        mode: "cors",
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return base;
    } catch {
      // Continuar con el siguiente
    }
  }
  return null;
}

/**
 * Obtiene la lista de impresoras disponibles en Zebra Browser Print.
 */
export async function obtenerImpresoras(base: string): Promise<ZebraPrinter[]> {
  try {
    const res = await fetch(`${base}/available`, {
      method: "GET",
      mode: "cors",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    // Browser Print retorna { printer: [...] } o directamente un array
    return Array.isArray(json) ? json : (json.printer ?? []);
  } catch {
    return [];
  }
}

/**
 * Envía ZPL a una impresora específica via Zebra Browser Print.
 */
export async function imprimirZPL(
  base: string,
  impresora: ZebraPrinter,
  zpl: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${base}/write`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ device: impresora, data: zpl }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "Error desconocido");
      return { ok: false, error: txt };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Error de conexión" };
  }
}

/**
 * Flujo completo: detectar + obtener impresoras.
 * Retorna null si Browser Print no está disponible.
 */
export async function conectarZebra(): Promise<{
  base: string;
  impresoras: ZebraPrinter[];
} | null> {
  const base = await detectarZebraBrowserPrint();
  if (!base) return null;
  const impresoras = await obtenerImpresoras(base);
  return { base, impresoras };
}
