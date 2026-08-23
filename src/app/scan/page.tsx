"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Camera, RotateCcw, Package, LogOut } from "lucide-react";
import Link from "next/link";
import jsQR from "jsqr";
import { normalizeCategoryIcon } from "@/lib/category-icon";
import { useAuth } from "@/lib/auth-context";

type Pantalla = "camara" | "confirmacion" | "procesando" | "exito" | "ya_usado" | "no_encontrado" | "error";

interface ItemInfo {
  id: string;
  estado: string;
  cantidad: number;
  atributos: Record<string, string>;
  categoria?: { nombre: string; icono: string; campos?: { nombre: string; label: string }[] };
  cantidadAnterior?: number;
}

export default function ScanPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const idParam       = searchParams.get("id");
  const { user, puede, signOut } = useAuth();

  const [pantalla, setPantalla]         = useState<Pantalla>(idParam ? "procesando" : "camara");
  const [item, setItem]                 = useState<ItemInfo | null>(null);
  const [itemPrevio, setItemPrevio]     = useState<ItemInfo | null>(null);
  const [idPendiente, setIdPendiente]   = useState<string | null>(null);
  const [camaraError, setCamaraError]   = useState("");
  const [scannerOn, setScannerOn]       = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const procesando  = useRef(false);
  const mounted     = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      detener();
    };
  }, []);

  useEffect(() => {
    if (idParam) procesarId(idParam);
  }, [idParam]);

  function detener() {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (mounted.current) setScannerOn(false);
  }

  async function procesarId(id: string) {
    if (procesando.current) return;
    procesando.current = true;
    detener();
    if (mounted.current) setPantalla("procesando");

    try {
      const res  = await fetch("/api/public/scan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!mounted.current) return;

      if (res.status === 404)      { setPantalla("no_encontrado"); }
      else if (res.status === 409) { setItem(json.item ?? null); setPantalla("ya_usado"); }
      else if (!res.ok)            { setPantalla("error"); }
      else                         { setItem(json); setPantalla("exito"); }
    } catch {
      if (mounted.current) setPantalla("error");
    } finally {
      procesando.current = false;
    }
  }

  const iniciarCamara = useCallback(async () => {
    setCamaraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (!mounted.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScannerOn(true);
      escanearLoop();
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setCamaraError("Permiso de cámara denegado. Actívalo en Configuración del navegador.");
      } else if (msg.includes("NotFound") || msg.includes("Devices")) {
        setCamaraError("No se encontró cámara en este dispositivo.");
      } else {
        setCamaraError("No se pudo iniciar la cámara. " + msg);
      }
    }
  }, []);

  function escanearLoop() {
    rafRef.current = requestAnimationFrame(async () => {
      if (!mounted.current) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        escanearLoop(); return;
      }

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { escanearLoop(); return; }
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code?.data && !procesando.current) {
        procesando.current = true;
        detener();

        let id = code.data;
        try {
          const url = new URL(code.data);
          id = url.searchParams.get("id") ?? code.data;
        } catch { /* no es URL */ }

        try {
          const info = await fetch(`/api/items/${id}`).then(r => r.ok ? r.json() : null).catch(() => null);
          if (!mounted.current) return;

          if (!info) {
            setPantalla("no_encontrado");
            procesando.current = false;
            return;
          }

          setItemPrevio(info);
          setIdPendiente(id);
          setPantalla("confirmacion");
        } finally {
          procesando.current = false;
        }
      } else {
        escanearLoop();
      }
    });
  }

  useEffect(() => {
    if (pantalla === "camara" && !idParam && !scannerOn) {
      const t = setTimeout(iniciarCamara, 300);
      return () => clearTimeout(t);
    }
  }, [pantalla]);

  function reiniciar() {
    setItem(null); setItemPrevio(null); setIdPendiente(null);
    setCamaraError(""); procesando.current = false;
    setPantalla("camara");
  }

  async function handleLogout() {
    detener();
    await signOut();
    router.push("/login");
  }

  function BarraSuperior({ dark }: { dark?: boolean }) {
    if (!user) return null;
    return (
      <div className={`absolute top-0 inset-x-0 px-4 pt-4 flex items-center justify-end gap-2 z-10 ${dark ? "" : ""}`}>
        {puede("verDashboard") && (
          <Link href="/inventario"
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              dark ? "text-slate-400 hover:text-white border-slate-700" : "text-slate-500 hover:text-slate-800 border-slate-200"
            }`}>
            Inventario
          </Link>
        )}
        <button onClick={handleLogout}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            dark ? "text-slate-400 hover:text-red-400 border-slate-700" : "text-slate-500 hover:text-red-500 border-slate-200"
          }`}>
          <LogOut size={13} /> Cerrar sesión
        </button>
      </div>
    );
  }

  const cat   = (item ?? itemPrevio)?.categoria;
  const attrs = Object.entries((item ?? itemPrevio)?.atributos ?? {});

  // ── CÁMARA ────────────────────────────────────────────────────
  if (pantalla === "camara") return (
    <div className="min-h-screen bg-slate-900 flex flex-col relative">
      <BarraSuperior dark />
      <div className="px-4 pt-10 pb-3 flex items-center justify-center">
        <p className="text-white font-semibold text-sm flex items-center gap-2">
          <Camera size={16} className="text-sky-400" /> Escanear QR
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5">
        <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-slate-800">
          <video ref={videoRef} className="w-full aspect-square object-cover" muted playsInline />
          {/* Marco guía */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 border-2 border-sky-400 rounded-xl" />
          </div>
          {!scannerOn && !camaraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <Loader2 size={32} className="text-sky-500 animate-spin" />
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {camaraError ? (
          <div className="text-center space-y-3 max-w-xs">
            <p className="text-red-400 text-sm">{camaraError}</p>
            <button onClick={iniciarCamara}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 mx-auto">
              <Camera size={16} /> Reintentar
            </button>
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center">
            {scannerOn ? "Apunta al código QR del producto" : "Iniciando cámara..."}
          </p>
        )}
      </div>
    </div>
  );

  // ── CONFIRMACIÓN ──────────────────────────────────────────────
  if (pantalla === "confirmacion" && itemPrevio) {
    const cantidad = itemPrevio.cantidad ?? 1;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 relative">
        <BarraSuperior />
        <div className="max-w-sm w-full space-y-5">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
              <img
                src={normalizeCategoryIcon(itemPrevio.categoria?.icono) ?? "/icon-192.png"}
                alt={itemPrevio.categoria?.nombre ?? "Categoría"}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-xl font-bold text-slate-800">¿Descontar del stock?</h1>
            <p className="text-slate-500 text-sm mt-1">
              Se descontará <strong>1 unidad</strong>. Quedarán <strong>{Math.max(0, cantidad - 1)}</strong>.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Categoría</span>
              <span className="text-sm font-medium">{itemPrevio.categoria?.nombre}</span>
            </div>
            {attrs.filter(([, v]) => v?.trim()).map(([k, v]) => {
              const campo = cat?.campos?.find(c => c.nombre === k);
              return (
                <div key={k} className="flex justify-between">
                  <span className="text-xs text-slate-400">{campo?.label ?? k}</span>
                  <span className="text-sm font-medium capitalize">{v}</span>
                </div>
              );
            })}
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">Stock actual</span>
              <span className="text-sm font-bold">{cantidad} unidades</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={reiniciar} className="py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm">No, cancelar</button>
            <button onClick={() => idPendiente && procesarId(idPendiente)} className="py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700">Sí, descontar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PROCESANDO ────────────────────────────────────────────────
  if (pantalla === "procesando") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-4 flex-col">
      <Loader2 size={40} className="text-sky-500 animate-spin" />
      <p className="text-slate-500">Procesando...</p>
    </div>
  );

  // ── RESULTADOS ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 text-center relative">
      <BarraSuperior />
      <div className="max-w-sm w-full space-y-6">
        {pantalla === "exito" && item && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">¡Descontado!</h1>
              <p className="text-slate-500 text-sm">{item.cantidad === 0 ? "Stock agotado" : `Quedan ${item.cantidad} unidades`}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left space-y-2">
              {Object.entries(item.atributos ?? {}).filter(([,v]) => v?.trim()).map(([k, v]) => {
                const campo = item.categoria?.campos?.find(c => c.nombre === k);
                return (
                  <div key={k} className="flex justify-between">
                    <span className="text-xs text-slate-400">{campo?.label ?? k}</span>
                    <span className="text-sm font-medium capitalize">{v}</span>
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">Stock restante</span>
                <span className="text-sm font-bold">{item.cantidad}</span>
              </div>
            </div>
            <button onClick={reiniciar} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sky-600 text-white font-semibold hover:bg-sky-700">
              <RotateCcw size={16} /> Escanear otro
            </button>
          </>
        )}
        {pantalla === "ya_usado" && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <AlertCircle size={40} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Sin stock</h1>
            <p className="text-slate-500 text-sm">Este ítem ya fue completamente descontado</p>
            <button onClick={reiniciar} className="w-full py-3 rounded-2xl bg-sky-600 text-white font-semibold">Escanear otro</button>
          </>
        )}
        {(pantalla === "no_encontrado" || pantalla === "error") && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle size={40} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{pantalla === "no_encontrado" ? "No encontrado" : "Error"}</h1>
            <p className="text-slate-500 text-sm">{pantalla === "no_encontrado" ? "Este QR no corresponde a ningún producto." : "Algo salió mal. Intenta nuevamente."}</p>
            <button onClick={reiniciar} className="w-full py-3 rounded-2xl bg-sky-600 text-white font-semibold">Intentar de nuevo</button>
          </>
        )}
      </div>
    </div>
  );
}
