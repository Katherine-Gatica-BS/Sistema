/**
 * Rate limiting ligero en memoria (sliding window fijo).
 *
 * Pensado para endpoints públicos sin autenticación (ej. /api/public/scan)
 * donde hay que frenar abuso/fuerza bruta sin afectar el uso normal.
 *
 * Nota de escalabilidad: este contador vive en memoria del proceso, por lo
 * que en un despliegue serverless/multi-instancia cada instancia lleva su
 * propio conteo (protección "best effort"). Para límites estrictos y
 * consistentes entre instancias, reemplazar el Map por Redis/Upstash
 * manteniendo la misma firma de `checkRateLimit`.
 */

interface Ventana {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Ventana>();

// Evita fuga de memoria limpiando entradas vencidas periódicamente.
const LIMPIEZA_INTERVALO_MS = 5 * 60 * 1000;
let ultimaLimpieza = Date.now();

function limpiarVencidos(ahora: number) {
  if (ahora - ultimaLimpieza < LIMPIEZA_INTERVALO_MS) return;
  ultimaLimpieza = ahora;
  buckets.forEach((v, key) => {
    if (v.resetAt <= ahora) buckets.delete(key);
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Verifica y consume una unidad del límite para `key`.
 * @param key identificador único (ej. `scan:<ip>`)
 * @param limit máximo de solicitudes permitidas por ventana
 * @param windowMs duración de la ventana en milisegundos
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const ahora = Date.now();
  limpiarVencidos(ahora);

  let ventana = buckets.get(key);
  if (!ventana || ventana.resetAt <= ahora) {
    ventana = { count: 0, resetAt: ahora + windowMs };
    buckets.set(key, ventana);
  }

  ventana.count += 1;
  const allowed = ventana.count <= limit;
  return { allowed, remaining: Math.max(0, limit - ventana.count), resetAt: ventana.resetAt };
}

/** Extrae la IP del cliente desde los headers estándar de proxy/edge. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "desconocida";
}
