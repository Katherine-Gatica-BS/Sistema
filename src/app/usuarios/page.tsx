"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlus, Trash2, Loader2, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ROLES, type Rol } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";

interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  fecha_creacion: string;
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [apiError, setApiError] = useState("");

  const [nombre, setNombre]     = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol]           = useState<Rol>("viewer");
  const [creando, setCreando]   = useState(false);
  const [formError, setFormError] = useState("");

  const [eliminando, setEliminando]   = useState<Usuario | null>(null);
  const [eliminandoLoading, setEliminandoLoading] = useState(false);
  const [eliminandoError, setEliminandoError]     = useState("");

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setApiError("");
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsuarios(await res.json());
    else { const e = await res.json().catch(() => ({})); setApiError(e.error ?? "Error al cargar usuarios"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!nombre.trim() || !password.trim()) { setFormError("Completa nombre y contraseña"); return; }

    setCreando(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), password, rol }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setFormError(e.error ?? "No se pudo crear el usuario");
      setCreando(false);
      return;
    }
    setNombre(""); setPassword(""); setRol("viewer");
    setCreando(false);
    fetchUsuarios();
  }

  async function confirmarEliminar() {
    if (!eliminando) return;
    setEliminandoLoading(true);
    setEliminandoError("");
    const res = await fetch(`/api/usuarios/${eliminando.id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setEliminandoError(e.error ?? "No se pudo eliminar el usuario");
      setEliminandoLoading(false);
      return;
    }
    setEliminandoLoading(false);
    setEliminando(null);
    fetchUsuarios();
  }

  async function cambiarRol(u: Usuario, nuevoRol: Rol) {
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol: nuevoRol }),
    });
    if (res.ok) fetchUsuarios();
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
        <div>
          <h2 className="lg:hidden text-lg font-bold text-slate-800">Usuarios</h2>
          <p className="text-sm text-slate-400">{usuarios.length} usuario(s) registrados</p>
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            ⚠️ {apiError}
          </div>
        )}

        {/* Crear usuario */}
        <form onSubmit={handleCrear} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <UserPlus size={18} className="text-sky-600" /> Nuevo usuario
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Usuario</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="ej: juan"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
              <input value={password} onChange={e => setPassword(e.target.value)}
                type="text" placeholder="mín. 4 caracteres"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rol</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.filter(r => r.valor !== "master").map(r => (
                <button key={r.valor} type="button" onClick={() => setRol(r.valor)}
                  className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all ${
                    rol === r.valor ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                  <p className="text-xs text-slate-400">{r.descripcion}</p>
                </button>
              ))}
            </div>
          </div>
          {formError && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{formError}</div>
          )}
          <button type="submit" disabled={creando}
            className="w-full py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {creando ? <><Loader2 size={15} className="animate-spin" /> Creando...</> : "Crear usuario"}
          </button>
        </form>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <UsersIcon size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin usuarios aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {usuarios.map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {u.nombre.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                    {u.nombre}
                    {u.rol === "master" && <ShieldCheck size={14} className="text-amber-500" />}
                  </p>
                  <p className="text-xs text-slate-400">
                    Desde {new Date(u.fecha_creacion).toLocaleDateString("es-CL")}
                  </p>
                </div>
                {u.rol === "master" ? (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">Master</span>
                ) : (
                  <select
                    value={u.rol}
                    onChange={e => cambiarRol(u, e.target.value as Rol)}
                    disabled={u.id === user?.id}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white disabled:opacity-50"
                  >
                    {ROLES.filter(r => r.valor !== "master").map(r => (
                      <option key={r.valor} value={r.valor}>{r.label}</option>
                    ))}
                  </select>
                )}
                {u.rol !== "master" && (
                  <button onClick={() => { setEliminandoError(""); setEliminando(u); }}
                    disabled={u.id === user?.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!eliminando}
        title={eliminando ? `¿Eliminar a "${eliminando.nombre}"?` : ""}
        description="Perderá el acceso al sistema de inmediato. Esta acción no se puede deshacer."
        error={eliminandoError}
        loading={eliminandoLoading}
        confirmLabel="Eliminar"
        requireTypedWord="eliminar"
        onConfirm={confirmarEliminar}
        onCancel={() => !eliminandoLoading && setEliminando(null)}
      />
    </AppShell>
  );
}
