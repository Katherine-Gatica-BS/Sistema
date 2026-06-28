"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Home, LogOut } from "lucide-react";
import Link from "next/link";
import { Cono } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

type ScanState = "loading" | "success" | "already_used" | "not_found" | "error";

export default function ScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const id = searchParams.get("id");

  const [state, setState] = useState<ScanState>("loading");
  const [cono, setCono] = useState<Cono | null>(null);

  useEffect(() => {
    // Esperar a que el estado de auth esté resuelto
    if (authLoading) return;

    // El middleware ya debería haber redirigido, pero por doble seguridad:
    if (!user) {
      const redirectTo = `/scan${id ? `?id=${id}` : ""}`;
      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    if (!id) {
      setState("not_found");
      return;
    }

    async function markAsUsed() {
      const res = await fetch(`/api/cones/${id}`, { method: "PATCH" });
      const json = await res.json();

      if (res.status === 401) {
        // Sesión expirada — redirigir al login
        const redirectTo = `/scan?id=${id}`;
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      if (res.status === 404) {
        setState("not_found");
      } else if (res.status === 409 && json.alreadyUsed) {
        setState("already_used");
      } else if (!res.ok) {
        setState("error");
      } else {
        setCono(json);
        setState("success");
      }
    }

    markAsUsed();
  }, [id, user, authLoading, router]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  // Mostrar spinner mientras se resuelve la auth o se procesa
  if (authLoading || (state === "loading" && user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 size={48} className="text-brand-500 animate-spin" />
        <p className="text-slate-500 font-medium">Procesando cono...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Usuario logueado — botón cerrar sesión discreto */}
      {user && (
        <div className="absolute top-4 right-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      )}

      {state === "success" && cono && (
        <div className="space-y-6 max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">¡Cono usado!</h1>
            <p className="text-slate-500 text-sm">El cono fue marcado correctamente</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left space-y-2">
            <Row label="Tipo" value={cono.tipo} />
            <Row label="Color" value={cono.color} />
            <Row label="Medida" value={cono.medida} />
            <Row label="Fecha de uso" value={new Date(cono.fecha_uso!).toLocaleString("es-CL")} />
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
          >
            <Home size={18} />
            Ir al inventario
          </Link>
        </div>
      )}

      {state === "already_used" && (
        <div className="space-y-6 max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <AlertCircle size={40} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Ya fue usado</h1>
            <p className="text-slate-500 text-sm">Este cono ya estaba marcado como usado anteriormente</p>
          </div>
          <Link href="/" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors">
            <Home size={18} />
            Ir al inventario
          </Link>
        </div>
      )}

      {(state === "not_found" || state === "error") && (
        <div className="space-y-6 max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle size={40} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">
              {state === "not_found" ? "Cono no encontrado" : "Error del servidor"}
            </h1>
            <p className="text-slate-500 text-sm">
              {state === "not_found"
                ? "El código QR no corresponde a ningún cono registrado"
                : "Algo salió mal. Intenta nuevamente"}
            </p>
          </div>
          <Link href="/" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors">
            <Home size={18} />
            Ir al inventario
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700 capitalize">{value}</span>
    </div>
  );
}
