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
  const [anchoMm, setAnchoMm]       = useState(50);
  const [altoMm, setAltoMm]         = useState(30);
  const [showConfig, setShowConfig]  = useState(false);
  const [zebraEstado, setZebraEstado]       = useState<ZebraEstado>("detectando");
  const [zebraBase, setZebraBase]           = useState<string | null>(null);
  const [impresoras, setImpresoras]         = useState<ZebraPrinter[]>([]);
  const [impresoraSelec, setImpresoraSelec] = useState<ZebraPrinter | null>(null);
  const [zebraMsg, setZebraMsg]             = useState("");

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

    const fontBase = Math.max(4.5, Math.min(8, altoMm * 0.22));
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

      return `<div class="label" ${breakStyle}>
  <div class="qr-col">
    <img src="${qr}" class="qr-img" />
  </div>
  <div class="sep"></div>
  <div class="txt-col">
    <div class="cat-txt">${cat?.nombre ?? ""}</div>
    <table class="tbl">${filas}</table>
    <div class="id-txt">#${item.id.slice(0, 10).toUpperCase()}</div>
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
  height: ${altoMm}mm;
  font-family: Arial, Helvetica, sans-serif;
  background: #fff;
}

.label {
  width: ${anchoMm}mm;
  height: ${altoMm}mm;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 1.5mm 2mm;
  gap: 0;
  overflow: hidden;
}

.qr-col {
  flex: 0 0 40%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.qr-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  display: block;
  object-fit: contain;
}

.sep {
  flex: 0 0 0.5mm;
  height: 80%;
  background: #ccc;
  margin: 0 1.5mm;
}

.txt-col {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  overflow: hidden;
}

.cat-txt {
  font-size: ${fontBase - 1}pt;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.4pt;
  white-space: nowrap;
  overflow: hidden;
  margin-bottom: 0.8mm;
}

.tbl {
  border-collapse: collapse;
  width: 100%;
}
.tbl td {
  font-size: ${fontBase}pt;
  line-height: 1.4;
  vertical-align: top;
  padding: 0;
  overflow: hidden;
}
.tbl .lbl {
  color: #999;
  width: 40%;
  padding-right: 0.5mm;
  white-space: nowrap;
}
.tbl .val {
  color: #111;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}

.id-txt {
  font-size: ${fontBase - 1.5}pt;
  color: #bbb;
  font-family: monospace;
  margin-top: 1mm;
  white-space: nowrap;
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
          {showConfig && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map(item => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="font-semibold text-slate-800 text-sm truncate">{item.categoria?.nombre ?? "Sin categoría"}</div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">#{item.id.slice(0, 8)}</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-24 h-24 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center p-2">
                    {loadingQr ? (
                      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                    ) : (
                      <img src={qrMap[item.id]} alt={item.id} className="max-h-[88px] w-auto rounded-md" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5 text-xs text-slate-600">
                    <div className="font-semibold text-slate-800 text-sm truncate">
                      {Object.values(item.atributos ?? {})[0] ?? "Sin nombre"}
                    </div>
                    {Object.entries(item.atributos ?? {}).slice(1, 4).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[72px_1fr] gap-2">
                        <span className="text-slate-400 truncate">{key}</span>
                        <span className="font-medium text-slate-700 break-words">{String(value)}</span>
                      </div>
                    ))}
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

