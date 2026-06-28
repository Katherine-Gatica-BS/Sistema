"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, CheckCircle, Circle, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Cono } from "@/lib/supabase";
import { ConoCard } from "@/components/ConoCard";
import { CreateConoForm } from "@/components/CreateConoForm";
import { useAuth } from "@/lib/auth-context";

type Tab = "disponible" | "usado";

export default function HomePage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const [conos, setConos] = useState<Cono[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("disponible");

  const fetchConos = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cones");
    if (res.ok) {
      const data = await res.json();
      setConos(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConos();
  }, [fetchConos]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const disponibles = conos.filter((c) => c.estado === "disponible");
  const usados = conos.filter((c) => c.estado === "usado");
  const filtered = tab === "disponible" ? disponibles : usados;

  return (
    <div className="pb-8">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">Inventario Conos</h1>
              <p className="text-xs text-slate-400">{conos.length} conos registrados</p>
            </div>
          </div>

          {/* User + logout */}
          {!authLoading && user && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <User size={12} />
                <span className="max-w-[120px] truncate">{user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut size={12} />
                Salir
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <Circle size={14} className="text-emerald-500 fill-emerald-500" />
            <div>
              <p className="text-xl font-bold text-emerald-700 leading-none">{disponibles.length}</p>
              <p className="text-xs text-emerald-600">Disponibles</p>
            </div>
          </div>
          <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle size={14} className="text-slate-400" />
            <div>
              <p className="text-xl font-bold text-slate-600 leading-none">{usados.length}</p>
              <p className="text-xs text-slate-500">Usados</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Create form — solo si está logueado */}
        {user && <CreateConoForm onCreated={fetchConos} />}

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(["disponible", "usado"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "disponible" ? `Disponibles (${disponibles.length})` : `Usados (${usados.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay conos {tab === "disponible" ? "disponibles" : "usados"}</p>
            {tab === "disponible" && user && (
              <p className="text-sm mt-1">Agrega tu primer cono arriba</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <ConoCard key={c.id} cono={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
