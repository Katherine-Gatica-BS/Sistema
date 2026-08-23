"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
          <AlertTriangle size={28} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Ocurrió un problema</h1>
          <p className="text-sm text-slate-500 mt-1">
            Algo no salió como esperábamos. Puedes intentarlo de nuevo o volver al inicio.
          </p>
        </div>
        {error?.message && (
          <p className="text-xs text-slate-400 bg-white border border-slate-100 rounded-xl px-4 py-3 break-words">
            {error.message}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition-colors"
          >
            <RotateCcw size={15} /> Reintentar
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
          >
            <Home size={15} /> Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
