"use client";

import { useState } from "react";
import { QrCode, ChevronDown, ChevronUp, CheckCircle2, Printer } from "lucide-react";
import { Item } from "@/lib/supabase";
import { generateQRDataUrl } from "@/lib/qr";
import { normalizeCategoryIcon } from "@/lib/category-icon";

interface Props {
  item: Item;
  seleccionado?: boolean;
  modoSeleccion?: boolean;
  onToggleSeleccion?: (id: string) => void;
}

function CatIcon({ icono, nombre }: { icono?: string; nombre?: string }) {
  if (!icono) return <span>📦</span>;
  const src = normalizeCategoryIcon(icono);
  if (src) {
    return <img src={src} alt={nombre ?? ""} className="w-6 h-6 rounded object-cover flex-shrink-0" />;
  }
  return <span className="text-sm">{icono}</span>;
}

export function ItemCard({ item, seleccionado, modoSeleccion, onToggleSeleccion }: Props) {
  const [qrSrc, setQrSrc]         = useState<string | null>(null);
  const [showQr, setShowQr]       = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);

  const disponible = item.estado === "disponible";
  const cat        = item.categoria;
  const attrs      = Object.entries(item.atributos ?? {});
  const titulo     = attrs[0]?.[1] ?? "Sin nombre";
  const resto      = attrs.slice(1);

  async function getQr(): Promise<string> {
    if (qrSrc) return qrSrc;
    const src = await generateQRDataUrl(item.id);
    setQrSrc(src);
    return src;
  }

  async function handleToggleQr(e: React.MouseEvent) {
    e.stopPropagation();
    if (showQr) { setShowQr(false); return; }
    setLoadingQr(true);
    await getQr();
    setLoadingQr(false);
    setShowQr(true);
  }

  async function handlePrintSingle(e: React.MouseEvent) {
    e.stopPropagation();
    const qr = await getQr();
    const win = window.open("", "_blank");
    if (!win) return;

    const attrs2  = Object.entries(item.atributos ?? {});
    const titulo2 = attrs2[0]?.[1] ?? "Sin nombre";
    const rows = attrs2.map(([k, v]) => {
      const campo = cat?.campos?.find(c => c.nombre === k);
      return `<tr><td class="lbl">${campo?.label ?? k}</td><td class="val">${v}</td></tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Etiqueta</title>
<style>
  @page { size: 50mm 30mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; }
  .label {
    width: 50mm; height: 30mm;
    display: flex; flex-direction: row;
    align-items: center;
    padding: 2mm; gap: 2mm;
    border: 0.3mm solid #ccc;
  }
  .qr-col { flex-shrink: 0; width: 24mm; height: 24mm; }
  .qr-col img { width: 24mm; height: 24mm; display: block; }
  .divider { flex-shrink: 0; width: 0.3mm; height: 26mm; background: #ddd; }
  .info-col {
    flex: 1; min-width: 0; padding-left: 1.5mm;
    display: flex; flex-direction: column; justify-content: center; gap: 0.5mm;
  }
  .cat-name { font-size: 5.5pt; color: #888; text-transform: uppercase; }
  .product-name { font-size: 8pt; font-weight: bold; color: #111; text-transform: uppercase; }
  table { border-collapse: collapse; width: 100%; margin-top: 0.5mm; }
  td { font-size: 6pt; color: #333; padding: 0; vertical-align: top; }
  td.lbl { color: #999; padding-right: 1mm; width: 40%; white-space: nowrap; }
  td.val { font-weight: 500; }
  .prod-id { font-size: 5pt; color: #bbb; font-family: monospace; margin-top: 1mm; }
</style></head><body>
<div class="label">
  <div class="qr-col"><img src="${qr}"/></div>
  <div class="divider"></div>
  <div class="info-col">
    <div class="cat-name">${cat?.nombre ?? ""}</div>
    <div class="product-name">${titulo2}</div>
    <table>${rows}</table>
    <div class="prod-id">#${item.id.slice(0,12).toUpperCase()}</div>
  </div>
</div>
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),400);}<\/script>
</body></html>`);
    win.document.close();
  }

  function handleCardClick() {
    if (modoSeleccion && onToggleSeleccion) onToggleSeleccion(item.id);
  }

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
        modoSeleccion ? "cursor-pointer select-none" : ""
      } ${seleccionado ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-100"}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <CatIcon icono={cat?.icono} nombre={cat?.nombre} />
              <span className="text-xs text-slate-400 font-medium truncate">{cat?.nombre}</span>
            </div>
            <h3 className="font-semibold text-slate-800 capitalize truncate">{titulo}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              disponible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${disponible ? "bg-emerald-500" : "bg-slate-400"}`} />
              {disponible ? "Disponible" : "Usado"}
            </span>
            {modoSeleccion && (
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                seleccionado ? "bg-sky-500 border-sky-500" : "border-slate-300"
              }`}>
                {seleccionado && <CheckCircle2 size={14} className="text-white" />}
              </div>
            )}
          </div>
        </div>

        {/* Atributos */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
          {resto.map(([k, v]) => {
            const campo = cat?.campos?.find(c => c.nombre === k);
            return (
              <div key={k}>
                <p className="text-xs text-slate-400">{campo?.label ?? k}</p>
                <p className="font-medium text-slate-700 capitalize truncate">{v}</p>
              </div>
            );
          })}
          {item.cantidad > 1 && (
            <div>
              <p className="text-xs text-slate-400">Cantidad</p>
              <p className="font-medium text-slate-700">{item.cantidad}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400">Creado</p>
            <p className="font-medium text-slate-700">{new Date(item.fecha_creacion).toLocaleDateString("es-CL")}</p>
          </div>
          {item.fecha_uso && (
            <div>
              <p className="text-xs text-slate-400">Usado</p>
              <p className="font-medium text-slate-700">{new Date(item.fecha_uso).toLocaleDateString("es-CL")}</p>
            </div>
          )}
        </div>

        {/* Acciones — solo si no está en modo selección */}
        {!modoSeleccion && disponible && (
          <div className="flex gap-2">
            <button
              onClick={handleToggleQr}
              disabled={loadingQr}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-sky-500 text-sky-600 text-sm font-medium hover:bg-sky-50 transition-colors disabled:opacity-50"
            >
              <QrCode size={15} />
              {loadingQr ? "Generando..." : showQr ? "Ocultar QR" : "Ver QR"}
              {!loadingQr && (showQr ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
            </button>
            <button
              onClick={handlePrintSingle}
              className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              title="Imprimir etiqueta"
            >
              <Printer size={15} />
            </button>
          </div>
        )}
      </div>

      {/* QR expandido — QR a la izquierda, info a la derecha */}
      {showQr && qrSrc && !modoSeleccion && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-32">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <img src={qrSrc} alt="QR" className="w-full h-28 object-contain" />
              </div>
              <a
                href={qrSrc}
                download={`qr-${item.id.slice(0, 8)}.png`}
                className="block text-xs text-sky-600 underline text-center mt-2"
                onClick={e => e.stopPropagation()}
              >
                Descargar
              </a>
            </div>

            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex items-center gap-2">
                <CatIcon icono={cat?.icono} nombre={cat?.nombre} />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cat?.nombre}</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <p className="font-bold text-slate-800 capitalize text-base">{titulo}</p>

                <div className="space-y-1.5 text-xs">
                  {attrs.slice(1).map(([k, v]) => {
                    const campo = cat?.campos?.find(c => c.nombre === k);
                    return (
                      <div key={k} className="grid grid-cols-[90px_1fr] gap-2 items-center">
                        <span className="text-slate-400">{campo?.label ?? k}</span>
                        <span className="text-slate-700 font-medium capitalize break-words">{v}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                  <p className="font-mono text-slate-300">#{item.id.slice(0, 12).toUpperCase()}</p>
                  <p>Escanea para marcar como usado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
