"use client";

import { useEffect, useState, useCallback } from "react";
import { History, Plus, Pencil, Trash2, ScanLine, CheckSquare, Square, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Registro {
  id: string;
  usuario_nombre: string;
  accion: "crear" | "editar" | "eliminar" | "marcar_usado";
  entidad: "item" | "categoria" | "usuario";
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
  fecha: string;
}

const ACCION_ICONO: Record<Registro["accion"], React.ReactNode> = {
  crear:         <Plus size={14} className="text-emerald-600" />,
  editar:        <Pencil size={14} className="text-sky-600" />,
  eliminar:      <Trash2 size={14} className="text-red-600" />,
  marcar_usado:  <ScanLine size={14} className="text-amber-600" />,
};

const ACCION_LABEL: Record<Registro["accion"], string> = {
  crear: "creó", editar: "editó", eliminar: "eliminó", marcar_usado: "escaneó (marcó usado)",
};

const ENTIDAD_LABEL: Record<Registro["entidad"], string> = {
  item: "un producto", categoria: "una categoría", usuario: "un usuario",
};

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading]     = useState(true);
  const [apiError, setApiError]   = useState("");

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [borrando, setBorrando]           = useState<"uno" | "seleccion" | "todo" | null>(null);
  const [borrarError, setBorrarError]     = useState("");
  const [eliminandoUno, setEliminandoUno] = useState<Registro | null>(null);
  const [showBorrarSeleccion, setShowBorrarSeleccion] = useState(false);
  const [showBorrarTodo, setShowBorrarTodo]           = useState(false);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    setApiError("");
    const res = await fetch("/api/auditoria");
    if (res.ok) setRegistros(await res.json());
    else { const e = await res.json().catch(() => ({})); setApiError(e.error ?? "Error al cargar la auditoría"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function seleccionarTodos() { setSeleccionados(new Set(registros.map(r => r.id))); }
  function deseleccionarTodos() { setSeleccionados(new Set()); }
  function salirModoSeleccion() { setModoSeleccion(false); setSeleccionados(new Set()); }

  async function eliminar(body: { ids?: string[]; all?: boolean }) {
    setBorrarError("");
    const res = await fetch("/api/auditoria", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setBorrarError(e.error ?? "No se pudo eliminar");
      return false;
    }
    return true;
  }

  async function confirmarEliminarUno() {
    if (!eliminandoUno) return;
    setBorrando("uno");
    const ok = await eliminar({ ids: [eliminandoUno.id] });
    setBorrando(null);
    if (ok) { setEliminandoUno(null); fetchRegistros(); }
  }

  async function confirmarEliminarSeleccion() {
    setBorrando("seleccion");
    const ok = await eliminar({ ids: Array.from(seleccionados) });
    setBorrando(null);
    if (ok) { setShowBorrarSeleccion(false); salirModoSeleccion(); fetchRegistros(); }
  }

  async function confirmarEliminarTodo() {
    setBorrando("todo");
    const ok = await eliminar({ all: true });
    setBorrando(null);
    if (ok) { setShowBorrarTodo(false); salirModoSeleccion(); fetchRegistros(); }
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="lg:hidden text-lg font-bold text-slate-800">Auditoría</h2>
            <p className="text-sm text-slate-400">Registro de quién hizo cada cambio</p>
          </div>

          {registros.length > 0 && (
            !modoSeleccion ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setModoSeleccion(true)}
                  className="flex items-center gap-2 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                  <CheckSquare size={14} /> Seleccionar
                </button>
                <button onClick={() => { setBorrarError(""); setShowBorrarTodo(true); }}
                  className="flex items-center gap-2 py-2 px-3 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
                  <Trash2 size={14} /> Vaciar todo
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">{seleccionados.size} sel.</span>
                <button onClick={seleccionarTodos}
                  className="flex items-center gap-1.5 text-xs text-sky-600 font-medium px-2.5 py-1.5 rounded-lg hover:bg-sky-50">
                  <CheckSquare size={13} /> Todos
                </button>
                <button onClick={deseleccionarTodos}
                  className="flex items-center gap-1.5 text-xs text-slate-500 font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100">
                  <Square size={13} /> Ninguno
                </button>
                <button onClick={salirModoSeleccion}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>
            )
          )}
        </div>

        {modoSeleccion && seleccionados.size > 0 && (
          <button onClick={() => { setBorrarError(""); setShowBorrarSeleccion(true); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 shadow-sm">
            <Trash2 size={16} /> Eliminar {seleccionados.size}
          </button>
        )}

        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">⚠️ {apiError}</div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-slate-100" />)}
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <History size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin actividad registrada aún</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {registros.map(r => (
              <div key={r.id}
                onClick={() => modoSeleccion && toggleSeleccion(r.id)}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${modoSeleccion ? "cursor-pointer hover:bg-slate-50" : ""} ${
                  seleccionados.has(r.id) ? "bg-sky-50" : ""
                }`}
              >
                {modoSeleccion && (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    seleccionados.has(r.id) ? "bg-sky-500 border-sky-500" : "border-slate-300"
                  }`}>
                    {seleccionados.has(r.id) && <CheckSquare size={11} className="text-white" />}
                  </div>
                )}
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                  {ACCION_ICONO[r.accion]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{r.usuario_nombre}</span>{" "}
                    {ACCION_LABEL[r.accion]} {ENTIDAD_LABEL[r.entidad]}
                  </p>
                  {r.entidad_id && (
                    <p className="text-xs text-slate-400 font-mono truncate">#{r.entidad_id.slice(0, 16)}</p>
                  )}
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0 text-right">
                  {new Date(r.fecha).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                </p>
                {!modoSeleccion && (
                  <button onClick={(e) => { e.stopPropagation(); setBorrarError(""); setEliminandoUno(r); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 flex-shrink-0 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!eliminandoUno}
        title="¿Eliminar este registro?"
        description="Esta acción no se puede deshacer."
        error={borrarError}
        loading={borrando === "uno"}
        confirmLabel="Eliminar"
        requireTypedWord="eliminar"
        onConfirm={confirmarEliminarUno}
        onCancel={() => !borrando && setEliminandoUno(null)}
      />

      <ConfirmDialog
        open={showBorrarSeleccion}
        title={`¿Eliminar ${seleccionados.size} registro${seleccionados.size !== 1 ? "s" : ""}?`}
        description="Esta acción no se puede deshacer."
        error={borrarError}
        loading={borrando === "seleccion"}
        confirmLabel="Eliminar"
        requireTypedWord="eliminar"
        onConfirm={confirmarEliminarSeleccion}
        onCancel={() => !borrando && setShowBorrarSeleccion(false)}
      />

      <ConfirmDialog
        open={showBorrarTodo}
        title="¿Vaciar todo el registro de auditoría?"
        description="Se eliminarán todos los registros, sin excepción. Esta acción no se puede deshacer."
        error={borrarError}
        loading={borrando === "todo"}
        confirmLabel="Vaciar todo"
        requireTypedWord="eliminar"
        onConfirm={confirmarEliminarTodo}
        onCancel={() => !borrando && setShowBorrarTodo(false)}
      />
    </AppShell>
  );
}
