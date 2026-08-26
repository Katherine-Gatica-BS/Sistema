"use client";

import { useState, useEffect } from "react";
import { X, Download, Printer, Loader2, Settings, Wifi, WifiOff, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Item } from "@/lib/supabase";
import { generateQRDataUrl } from "@/lib/qr";
import { generarZPLBatch, descargarZPL, LabelData } from "@/lib/zpl";
import { conectarZebra, imprimirZPL, ZebraPrinter } from "@/lib/zebra-browser-print";
import { generateProductCode } from "@/lib/product-code";
import { conCamposBase } from "@/lib/category-fields";

interface Props {
  items: Item[];
  onClose: () => void;
}

const LABEL_SIZE_STORAGE_KEY = "cono-app-label-size";

function getPreferredLabelSize() {
  if (typeof window === "undefined") return { ancho: 100, alto: 50 };
  try {
    const saved = JSON.parse(localStorage.getItem(LABEL_SIZE_STORAGE_KEY) ?? "null");
    if (Number.isFinite(saved?.ancho) && Number.isFinite(saved?.alto)) {
      return { ancho: saved.ancho, alto: saved.alto };
    }
  } catch {
    // Use the default size when the saved preference is invalid.
  }
  return { ancho: 100, alto: 50 };
}

function itemToLabelData(item: Item): LabelData {
  const campos = conCamposBase(item.categoria?.campos);
  const vals   = Object.entries(item.atributos ?? {});
  return {
    id:        item.id,
    titulo:    vals[0]?.[1] ?? "Sin nombre",
    subtitulo: vals[1]?.[1] ?? "",
    categoria: item.categoria?.nombre ?? "",
    atributos: item.atributos ?? {},
    campos:    campos.map(c => ({ nombre: c.nombre, label: c.label })),
  };
}

type ZebraEstado = "detectando" | "disponible" | "no_disponible" | "imprimiendo" | "exito" | "error";

export function PrintPreviewModal({ items, onClose }: Props) {
  const [qrMap, setQrMap]           = useState<Record<string, string>>({});
  const [loadingQr, setLoadingQr]   = useState(true);
  const [anchoMm, setAnchoMm]       = useState(100);
  const [altoMm, setAltoMm]         = useState(50);
  const [showConfig, setShowConfig]  = useState(false);
  const [zebraEstado, setZebraEstado]       = useState<ZebraEstado>("detectando");
  const [zebraBase, setZebraBase]           = useState<string | null>(null);
  const [impresoras, setImpresoras]         = useState<ZebraPrinter[]>([]);
  const [impresoraSelec, setImpresoraSelec] = useState<ZebraPrinter | null>(null);
  const [zebraMsg, setZebraMsg]             = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(LABEL_SIZE_STORAGE_KEY, JSON.stringify({ ancho: 100, alto: 50 }));
    } catch {
      // Se mantiene el tamaño estándar para todas las etiquetas impresas.
    }
  }, []);

  useEffect(() => {
    async function gen() {
      const entries = await Promise.all(
        items.map(async item => [item.id, await generateQRDataUrl(item.id)] as const)
      );
      setQrMap(Object.fromEntries(entries));
      setLoadingQr(false);
    }
    gen();
  }, [items]);

  useEffect(() => {
    async function detectar() {
      const result = await conectarZebra();
      if (!result || result.impresoras.length === 0) { setZebraEstado("no_disponible"); return; }
      setZebraBase(result.base);
      setImpresoras(result.impresoras);
      setImpresoraSelec(result.impresoras[0]);
      setZebraEstado("disponible");
    }
    detectar();
  }, []);

  function getZPL() {
    return generarZPLBatch(items.map(itemToLabelData), { anchoMm: 100, altoMm: 50 });
  }

  async function handleImprimirZebra() {
    if (!zebraBase || !impresoraSelec) return;
    setZebraEstado("imprimiendo");
    const result = await imprimirZPL(zebraBase, impresoraSelec, getZPL());
    if (result.ok) { setZebraEstado("exito"); setZebraMsg(`${items.length} etiqueta(s) enviadas`); }
    else { setZebraEstado("error"); setZebraMsg(result.error ?? "Error"); }
  }

  function handleDescargarZPL() { descargarZPL(getZPL(), `etiquetas-${items.length}.zpl`); }

  function handleBrowserPrint() {
    if (loadingQr) { alert("Espera, los QR aún se están generando..."); return; }
    const win = window.open("", "_blank");
    if (!win) { alert("El navegador bloqueó la ventana. Permite pop-ups para este sitio."); return; }

    const ancho = 100;
    const alto = 50;
    const padX = 3;
    const padY = 2.5;
    const gap = 2;
    const qrSize = 34;
    const textW = 58;
    const fontBase = 8;

    const etiquetasHTML = items.map((item, idx) => {
      const qr = qrMap[item.id] ?? "";
      const cat = item.categoria;
      const attrs = Object.entries(item.atributos ?? {}).filter(([, v]) => v?.trim());
      const isLast = idx === items.length - 1;
      const codigo = generateProductCode(item);

      const filas = attrs.map(([k, v]) => {
        const campo = cat?.campos?.find(c => c.nombre === k);
        const label = (campo?.label ?? k).slice(0, 12);
        return `<div class="row"><span class="label">${label}:</span><span class="value">${String(v).slice(0, 21)}</span></div>`;
      }).join("");

      const breakStyle = isLast ? "" : 'style="page-break-after:always;break-after:page;"';

      return `<div class="page" ${breakStyle}>
  <div class="label">
    <div class="qr-box"><img src="${qr}" class="qr-img" /></div>
    <div class="divider"></div>
    <div class="info">
      <div class="title">${cat?.nombre ?? "Producto"}</div>
      <div class="rows">${filas}</div>
      <div class="meta">Creado: ${new Date(item.fecha_creacion).toLocaleDateString("es-ES")}</div>
      <div class="code">${codigo}</div>
    </div>
  </div>
</div>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: ${ancho}mm ${alto}mm; margin: 0; }
html, body { width: ${ancho}mm; margin: 0; font-family: Arial, Helvetica, sans-serif; background: #fff; }
.page { width: ${ancho}mm; height: ${alto}mm; display: flex; align-items: center; justify-content: center; }
.label {
  width: ${ancho - padX * 2}mm;
  height: ${alto - padY * 2}mm;
  display: flex;
  align-items: center;
  gap: ${gap}mm;
  padding: ${padY}mm ${padX}mm;
  border: 1px solid #dfe7f2;
  background: #fff;
  border-radius: 3px;
}
.qr-box {
  width: ${qrSize}mm;
  height: ${qrSize}mm;
  min-width: ${qrSize}mm;
  min-height: ${qrSize}mm;
  border: 1px solid #dfe7f2;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1mm;
}
.qr-img { width: 100%; height: 100%; object-fit: contain; }
.divider {
  width: 1px;
  height: 70%;
  background: #dfe7f2;
}
.info {
  width: ${textW}mm;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.1mm;
}
.title {
  font-size: 10pt;
  line-height: 1.1;
  font-weight: 700;
  color: #111827;
  letter-spacing: 0.2pt;
  text-transform: uppercase;
}
.rows {
  display: flex;
  flex-direction: column;
  gap: 0.7mm;
}
.row {
  display: grid;
  grid-template-columns: 24% 76%;
  gap: 1mm;
  align-items: center;
  font-size: ${fontBase - 0.5}pt;
  color: #111827;
  line-height: 1.2;
}
.label {
  font-weight: 700;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.value {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  font-size: 6.5pt;
  font-weight: 700;
  color: #334155;
  margin-top: 0.2mm;
}
.code {
  font-size: 6.5pt;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.2pt;
  font-family: monospace;
}
</style>
</head>
<body>
${etiquetasHTML}
<script>
window.addEventListener('load', function() { setTimeout(() => window.print(), 400); });
<\/script>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Vista previa de etiquetas</h3>
            <p className="text-sm text-slate-500">{items.length} producto{items.length !== 1 ? "s" : ""} seleccionados</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
            <span>
              Tamaño de etiqueta fijo: <strong>100 × 50 mm</strong> — se usa siempre para mantener la proporción correcta.
            </span>
            <button type="button" onClick={() => setShowConfig(v => !v)} className="text-xs font-semibold text-sky-700 hover:underline">
              {showConfig ? "Ocultar" : "Config."}
            </button>
          </div>

          {showConfig && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                El formato estándar es 100 × 50 mm y está bloqueado para evitar que la etiqueta se desarme o se vea corrida.
              </div>
              <div className="flex flex-wrap gap-2">
                {[{ a: 100, h: 50 }].map(p => (
                  <button
                    key={`${p.a}x${p.h}`}
                    type="button"
                    onClick={() => { setAnchoMm(p.a); setAltoMm(p.h); }}
                    className="rounded-lg border border-sky-500 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"
                  >
                    {p.a} × {p.h} mm estándar
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map(item => (
              <div
                key={item.id}
                style={{ aspectRatio: `${anchoMm} / ${altoMm}` }}
                className="min-h-[150px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="grid h-full min-h-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
                  <div className="flex h-full min-h-0 min-w-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-2">
                    {loadingQr ? (
                      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                    ) : (
                      <img src={qrMap[item.id]} alt={item.id} className="h-full w-full rounded-md object-contain" />
                    )}
                  </div>

                  <div className="min-w-0 self-stretch overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[11px] font-bold text-slate-900">{item.categoria?.nombre ?? "Sin categoría"}</span>
                      </div>
                    </div>

                    <div className="mt-1.5 space-y-0.5 text-[9px] leading-tight">
                      {conCamposBase(item.categoria?.campos).map((campo, index) => {
                        const value = item.atributos?.[campo.nombre];
                        if (!value) return null;
                        return (
                          <div key={campo.nombre} className="grid grid-cols-[52px_minmax(0,1fr)] gap-1">
                            <span className="truncate font-bold text-slate-700">{campo.label}:</span>
                            <span className="truncate font-bold text-slate-900">{String(value).substring(0, 22)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-[8px] font-bold leading-snug text-slate-900">
                      <div>Creado: {new Date(item.fecha_creacion).toLocaleDateString("es-ES")}</div>
                      <div className="mt-1 break-all font-mono text-[8px]">{generateProductCode(item)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {zebraEstado === "detectando" && <Loader2 className="h-4 w-4 animate-spin" />}
            {zebraEstado === "disponible" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {zebraEstado === "no_disponible" && <WifiOff className="h-4 w-4 text-amber-600" />}
            {zebraEstado === "error" && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {zebraEstado === "imprimiendo" && <Loader2 className="h-4 w-4 animate-spin text-sky-600" />}
            {zebraMsg || (zebraEstado === "disponible" ? "Zebra lista" : zebraEstado === "no_disponible" ? "Zebra no detectada" : "Estado de impresora")}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowConfig(v => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Settings size={15} /> Config.
            </button>

            {zebraEstado === "disponible" && (
              <button
                type="button"
                onClick={handleImprimirZebra}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                <Printer size={15} /> Imprimir Zebra
              </button>
            )}

            <button
              type="button"
              onClick={handleBrowserPrint}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Printer size={15} /> Imprimir navegador
            </button>

            <button
              type="button"
              onClick={handleDescargarZPL}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Download size={15} /> Descargar ZPL
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

