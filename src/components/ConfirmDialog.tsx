"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  error?: string;
  /** Si se define, el botón de confirmar solo se habilita al escribir esta palabra exacta. */
  requireTypedWord?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmación reutilizable — reemplaza window.confirm / window.prompt. */
export function ConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  danger = true,
  loading = false,
  error,
  requireTypedWord,
  onConfirm,
  onCancel,
}: Props) {
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (open) setTexto("");
  }, [open]);

  if (!open) return null;

  const confirmacionValida = !requireTypedWord
    || texto.trim().toLowerCase() === requireTypedWord.trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
            danger ? "bg-red-50 text-red-500" : "bg-sky-50 text-sky-600"
          }`}>
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">{title}</p>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-shrink-0 rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {detail && (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-slate-600">
            {detail}
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {requireTypedWord && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Escribe <span className="font-bold text-slate-700">"{requireTypedWord}"</span> para confirmar
            </label>
            <input
              autoFocus
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && confirmacionValida && !loading) onConfirm(); }}
              placeholder={requireTypedWord}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !confirmacionValida}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
