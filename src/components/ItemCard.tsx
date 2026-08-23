"use client";

import { useState } from "react";
import { QrCode, ChevronDown, ChevronUp, CheckCircle2, Printer, Trash2, Loader2 } from "lucide-react";
import { Item } from "@/lib/supabase";
import { generateQRDataUrl } from "@/lib/qr";
import { normalizeCategoryIcon } from "@/lib/category-icon";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PrintPreviewModal } from "@/components/PrintPreviewModal";
import { useAuth } from "@/lib/auth-context";

interface Props {
  item: Item;
  seleccionado?: boolean;
  modoSeleccion?: boolean;
  onToggleSeleccion?: (id: string) => void;
  onDeleted?: (id: string) => void;
}

function CatIcon({ icono, nombre }: { icono?: string; nombre?: string }) {
  if (!icono) return <span>📦</span>;
  const src = normalizeCategoryIcon(icono);
  if (src) {
    return <img src={src} alt={nombre ?? ""} className="w-6 h-6 rounded object-cover flex-shrink-0" />;
  }
  return <span className="text-sm">{icono}</span>;
}

export function ItemCard({ item, seleccionado, modoSeleccion, onToggleSeleccion, onDeleted }: Props) {
  const { puede } = useAuth();
  const puedeEliminar = puede("gestionarItems");
  const [qrSrc, setQrSrc]         = useState<string | null>(null);
  const [showQr, setShowQr]       = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const disponible = item.estado === "disponible";
  const cat        = item.categoria;

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

  function handlePrintSingle(e: React.MouseEvent) {
    e.stopPropagation();
    setShowPrintPreview(true);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteError("");
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el producto");
      }
      setShowDeleteConfirm(false);
      onDeleted?.(item.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar el producto");
    } finally {
      setDeleting(false);
    }
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
        <div className="space-y-3 text-sm mb-4">
          {/* Código único */}
          <div className="rounded-lg bg-slate-100 px-3 py-2 border border-slate-200">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Código</p>
            <p className="font-bold text-slate-900 font-mono text-xs mt-0.5">{item.id.slice(0, 16).toUpperCase()}</p>
          </div>
          
          {/* Atributos del producto */}
          {cat?.campos && cat.campos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {cat.campos.map(campo => {
                const valor = item.atributos?.[campo.nombre];
                if (!valor) return null;
                return (
                  <div key={campo.nombre}>
                    <p className="text-xs text-slate-500 font-medium">{campo.label}</p>
                    <p className="font-semibold text-slate-800 text-sm truncate">{String(valor)}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
          
          {/* Cantidad y Fechas */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {item.cantidad > 1 && (
              <div>
                <p className="text-xs text-slate-500 font-medium">Cantidad</p>
                <p className="font-semibold text-slate-800">{item.cantidad}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 font-medium">Creado</p>
              <p className="font-semibold text-slate-700 text-xs">{new Date(item.fecha_creacion).toLocaleDateString("es-CL")}</p>
            </div>
            {item.fecha_uso && (
              <div>
                <p className="text-xs text-slate-500 font-medium">Usado</p>
                <p className="font-semibold text-slate-700 text-xs">{new Date(item.fecha_uso).toLocaleDateString("es-CL")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones — solo si no está en modo selección */}
        {!modoSeleccion && (disponible || puedeEliminar) && (
          <div className="flex gap-2">
            {disponible && (
              <>
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
              </>
            )}
            {puedeEliminar && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`flex items-center justify-center rounded-xl border border-red-200 px-3 py-2.5 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                  disponible ? "" : "flex-1 gap-2 text-sm font-medium"
                }`}
                title="Eliminar producto"
                aria-label="Eliminar producto"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {!disponible && <span>{deleting ? "Eliminando..." : "Eliminar"}</span>}
              </button>
            )}
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
                <div className="space-y-1.5 text-xs">
                  {cat?.campos?.map(campo => {
                    const value = item.atributos?.[campo.nombre];
                    if (!value) return null;
                    return (
                      <div key={campo.nombre} className="grid grid-cols-[90px_1fr] gap-2 items-center">
                        <span className="text-slate-400">{campo.label}</span>
                        <span className="text-slate-700 font-medium capitalize break-words">{String(value)}</span>
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title={`¿Eliminar este producto?`}
        description="Esta acción no se puede deshacer."
        detail={`Código #${item.id.slice(0, 12).toUpperCase()} — ${cat?.nombre ?? "Sin categoría"}`}
        error={deleteError}
        loading={deleting}
        confirmLabel="Eliminar"
        requireTypedWord="eliminar"
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setShowDeleteConfirm(false)}
      />

      {showPrintPreview && (
        <PrintPreviewModal
          items={[item]}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
