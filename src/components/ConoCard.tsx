"use client";

import { useState } from "react";
import { QrCode, ChevronDown, ChevronUp } from "lucide-react";
import { Cono } from "@/lib/supabase";
import { Badge } from "./Badge";
import { generateQRDataUrl } from "@/lib/qr";

interface ConoCardProps {
  cono: Cono;
}

export function ConoCard({ cono }: ConoCardProps) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);

  async function handleToggleQr() {
    if (showQr) {
      setShowQr(false);
      return;
    }
    if (!qrSrc) {
      setLoadingQr(true);
      const src = await generateQRDataUrl(cono.id);
      setQrSrc(src);
      setLoadingQr(false);
    }
    setShowQr(true);
  }

  const fechaCreacion = new Date(cono.fecha_creacion).toLocaleDateString("es-CL");
  const fechaUso = cono.fecha_uso
    ? new Date(cono.fecha_uso).toLocaleDateString("es-CL")
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs text-slate-400 font-mono truncate">#{cono.id.slice(0, 8)}</p>
            <h3 className="font-semibold text-slate-800 capitalize">{cono.tipo}</h3>
          </div>
          <Badge estado={cono.estado} />
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <p className="text-xs text-slate-400">Color</p>
            <p className="font-medium text-slate-700 capitalize">{cono.color}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Medida</p>
            <p className="font-medium text-slate-700">{cono.medida}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Creado</p>
            <p className="font-medium text-slate-700">{fechaCreacion}</p>
          </div>
          {fechaUso && (
            <div>
              <p className="text-xs text-slate-400">Usado</p>
              <p className="font-medium text-slate-700">{fechaUso}</p>
            </div>
          )}
        </div>

        {/* QR Toggle */}
        {cono.estado === "disponible" && (
          <button
            onClick={handleToggleQr}
            disabled={loadingQr}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-brand-500 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors disabled:opacity-50"
          >
            <QrCode size={16} />
            {loadingQr ? "Generando..." : showQr ? "Ocultar QR" : "Ver QR"}
            {showQr ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* QR Image */}
      {showQr && qrSrc && (
        <div className="border-t border-slate-100 p-4 flex flex-col items-center gap-2 bg-slate-50">
          <img src={qrSrc} alt={`QR cono ${cono.id}`} className="w-40 h-40" />
          <p className="text-xs text-slate-400 text-center">
            Escanea para marcar como usado
          </p>
          <a
            href={qrSrc}
            download={`cono-${cono.id.slice(0, 8)}.png`}
            className="text-xs text-brand-600 underline"
          >
            Descargar imagen
          </a>
        </div>
      )}
    </div>
  );
}
