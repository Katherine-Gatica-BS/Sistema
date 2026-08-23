"use client";

import { useState, useEffect } from "react";
import { X, Download, Printer, Loader2, Settings, Wifi, WifiOff, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Item } from "@/lib/supabase";
import { generateQRDataUrl } from "@/lib/qr";
import { generarZPLBatch, descargarZPL, LabelData } from "@/lib/zpl";
import { conectarZebra, imprimirZPL, ZebraPrinter } from "@/lib/zebra-browser-print";

interface Props {
  items: Item[];
  onClose: () => void;
}

const LABEL_SIZE_STORAGE_KEY = "cono-app-label-size";

function getPreferredLabelSize() {
  if (typeof window === "undefined") return { ancho: 50, alto: 30 };
  try {
    const saved = JSON.parse(localStorage.getItem(LABEL_SIZE_STORAGE_KEY) ?? "null");
    if (Number.isFinite(saved?.ancho) && Number.isFinite(saved?.alto)) {
      return { ancho: saved.ancho, alto: saved.alto };
    }
  } catch {
    // Use the default size when the saved preference is invalid.
  }
  return { ancho: 50, alto: 30 };
}

function itemToLabelData(item: Item): LabelData {
  const campos = item.categoria?.campos ?? [];
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
  const [anchoMm, setAnchoMm]       = useState(() => getPreferredLabelSize().ancho);
  const [altoMm, setAltoMm]         = useState(() => getPreferredLabelSize().alto);
  const [showConfig, setShowConfig]  = useState(false);
  const [zebraEstado, setZebraEstado]       = useState<ZebraEstado>("detectando");
  const [zebraBase, setZebraBase]           = useState<string | null>(null);
  const [impresoras, setImpresoras]         = useState<ZebraPrinter[]>([]);
  const [impresoraSelec, setImpresoraSelec] = useState<ZebraPrinter | null>(null);
  const [zebraMsg, setZebraMsg]             = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(LABEL_SIZE_STORAGE_KEY, JSON.stringify({ ancho: anchoMm, alto: altoMm }));
    } catch {
      // La vista previa sigue funcionando aunque el navegador no permita guardar preferencias.
    }
  }, [anchoMm, altoMm]);

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
    return generarZPLBatch(items.map(itemToLabelData), { anchoMm, altoMm });
  }

  async function handleImprimirZebra() {
    if (!zebraBase || !impresoraSelec) return;
    setZebraEstado("imprimiendo");
    const result = await imprimirZPL(zebraBase, impresoraSelec, getZPL());
    if (result.ok) { setZebraEstado("exito"); setZebraMsg(`${items.length} etiqueta(s) enviadas`); }
    else { setZebraEstado("error"); setZebraMsg(result.error ?? "Error"); }
  }

  function handleDescargarZPL() { descargarZPL(getZPL(), `etiquetas-${items.length}.zpl`); }

  // ─── IMPRESIÓN BROWSER — layout correcto, sin saltos ────────────────────────
  function handleBrowserPrint() {
    if (loadingQr) { alert("Espera, los QR aún se están generando..."); return; }
    const win = window.open("", "_blank");
    if (!win) { alert("El navegador bloqueó la ventana. Permite pop-ups para este sitio."); return; }

    // Todas las medidas se calculan en mm de forma explícita (nada de % ni flex-basis)
    // para que ambos lados (QR y texto) respeten siempre el tamaño configurado,
    // sin importar qué tan chico o grande sea, y sin que uno se estire más que el otro.
    const padX      = Math.min(2.5, anchoMm * 0.06);
    const padY      = Math.min(2, altoMm * 0.08);
    const sepW      = 0.4;
    const gap       = Math.min(2, anchoMm * 0.04);
    const anchoUtil = anchoMm - padX * 2;
    const altoUtil  = altoMm - padY * 2;
    const qrSize    = Math.max(5, Math.min(altoUtil, anchoUtil * 0.42));
    const txtWidth  = Math.max(5, anchoUtil - qrSize - sepW - gap * 2);
    const fontBase  = Math.max(4.5, Math.min(8, altoMm * 0.22));

    const etiquetasHTML = items.map((item, idx) => {
      const qr = qrMap[item.id] ?? "";
      const cat = item.categoria;
      const attrs = Object.entries(item.atributos ?? {}).filter(([, v]) => v?.trim());
      const isLast = idx === items.length - 1;

      const filas = attrs.map(([k, v]) => {
        const campo = cat?.campos?.find(c => c.nombre === k);
        return `<tr>
          <td class="lbl">${campo?.label ?? k}</td>
          <td class="val">${String(v).substring(0, 30)}</td>
        </tr>`;
      }).join("");

      const breakStyle = isLast ? "" : 'style="page-break-after:always;break-after:page;"';

      return `<div class="page" ${breakStyle}>
  <div class="label">
    <div class="qr-col">
      <img src="${qr}" class="qr-img" />
    </div>
    <div class="sep"></div>
    <div class="txt-col">
      <div class="cat-txt">${cat?.nombre ?? ""}</div>
      <table class="tbl">${filas}</table>
      <div class="id-txt">#${item.id.slice(0, 10).toUpperCase()}</div>
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

@page {
  size: ${anchoMm}mm ${altoMm}mm;
  margin: 0;
}

html, body {
  width: ${anchoMm}mm;
  font-family: Arial, Helvetica, sans-serif;
  background: #fff;
}

.page {
  width: ${anchoMm}mm;
  height: ${altoMm}mm;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label {
  width: ${anchoUtil}mm;
  height: ${altoUtil}mm;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${gap}mm;
  overflow: hidden;
}

.qr-col {
  width: ${qrSize}mm;
  height: ${qrSize}mm;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.qr-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.sep {
  width: ${sepW}mm;
  height: ${Math.max(4, altoUtil * 0.8)}mm;
  flex: none;
  background: #ccc;
}

.txt-col {
  width: ${txtWidth}mm;
  height: ${altoUtil}mm;
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.cat-txt {
  font-size: ${fontBase - 1}pt;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 0.4pt;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.8mm;
}

.tbl {
  border-collapse: collapse;
  width: 100%;
  table-layout: fixed;
}
.tbl td {
  font-size: ${fontBase}pt;
  line-height: 1.4;
  vertical-align: top;
  padding: 0;
  overflow: hidden;
}
.tbl .lbl {
  color: #000;
  width: 40%;
  padding-right: 0.5mm;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tbl .val {
  color: #000;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.id-txt {
  font-size: ${fontBase - 1.5}pt;
  color: #000;
  font-family: monospace;
  margin-top: 1mm;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
</head>
<body>
${etiquetasHTML}
<script>
window.addEventListener('load', function() {
  setTimeout(function() { window.print(); }, 600);
});
<\/script>
</body>
</html>`;

    win.document.open();
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
              Tamaño de etiqueta guardado: <strong>{anchoMm} × {altoMm} mm</strong> — se usará siempre por defecto.
            </span>
            <button type="button" onClick={() => setShowConfig(v => !v)} className="text-xs font-semibold text-sky-700 hover:underline">
              {showConfig ? "Ocultar" : "Cambiar"}
            </button>
          </div>

          {showConfig && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Ancho (mm)</span>
                  <input
                    type="number"
                    min={20}
                    max={100}
                    value={anchoMm}
                    onChange={e => setAnchoMm(Number(e.target.value) || 50)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Alto (mm)</span>
                  <input
                    type="number"
                    min={20}
                    max={100}
                    value={altoMm}
                    onChange={e => setAltoMm(Number(e.target.value) || 30)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {[{ a: 50, h: 30 }, { a: 40, h: 30 }, { a: 60, h: 40 }, { a: 100, h: 50 }].map(p => (
                  <button
                    key={`${p.a}x${p.h}`}
                    type="button"
                    onClick={() => { setAnchoMm(p.a); setAltoMm(p.h); }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      anchoMm === p.a && altoMm === p.h
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p.a} × {p.h} mm
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                El tamaño se guarda automáticamente en este navegador y se usará por defecto la próxima vez que imprimas.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map(item => (
              <div
                key={item.id}
                style={{ aspectRatio: `${anchoMm} / ${altoMm}` }}
                className="min-h-[150px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="grid h-full min-h-0 grid-cols-2 items-center gap-3">
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
                        <span className="truncate text-xs font-bold text-slate-900">{item.categoria?.nombre ?? "Sin categoría"}</span>
                      </div>
                      <span className="shrink-0 font-mono text-[9px] font-bold text-slate-900">#{item.id.slice(0, 8)}</span>
                    </div>

                    <div className="mt-1.5 space-y-0.5 text-[10px] leading-tight">
                      {item.categoria?.campos.map((campo, index) => {
                        const value = item.atributos?.[campo.nombre];
                        if (!value) return null;
                        return (
                          <div key={campo.nombre} className="grid grid-cols-[56px_minmax(0,1fr)] gap-1">
                            <span className="truncate font-bold text-slate-900">{campo.label}:</span>
                            <span className="truncate font-bold text-slate-900">{String(value).substring(0, 22)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 text-[8px] font-bold leading-none text-slate-900">
                      Creado: {new Date(item.fecha_creacion).toLocaleDateString("es-ES")}
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

