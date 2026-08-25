"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Tag, Loader2, Pencil, Trash2, ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Categoria, CampoSchema } from "@/lib/supabase";
import { normalizeCategoryIcon } from "@/lib/category-icon";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const COLORES = [
  "#0ea5e9","#10b981","#f59e0b","#8b5cf6",
  "#ef4444","#f97316","#64748b","#0f172a",
  "#ec4899","#14b8a6",
];

const CAMPO_VACÍO: CampoSchema = { nombre: "", label: "", tipo: "text", requerido: false };

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function makeUniqueFieldName(base: string, usedNames: Set<string>, fallback = "campo") {
  const cleanBase = slugify(base || fallback) || fallback;
  let candidate = cleanBase;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${cleanBase}_${suffix}`;
    suffix += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

/* ── Formulario reutilizable para crear / editar ─────────────── */
function CategoriaForm({
  inicial,
  onGuardar,
  onCancelar,
  guardando,
  error,
}: {
  inicial?: Categoria;
  onGuardar: (d: { nombre: string; icono: string; color: string; campos: CampoSchema[] }) => void;
  onCancelar: () => void;
  guardando: boolean;
  error: string;
}) {
  const esEdicion = !!inicial;

  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [icono,  setIcono]  = useState(inicial?.icono  ?? "");
  const [color,  setColor]  = useState(inicial?.color  ?? "#0ea5e9");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");
  // Campos existentes — ahora editables y eliminables
  const [camposActuales, setCamposActuales] = useState<CampoSchema[]>(inicial?.campos ?? []);
  const [opcionesTextoActuales, setOpcionesTextoActuales] = useState<Record<number, string>>({});
  const [campoAEliminar, setCampoAEliminar] = useState<number | null>(null);
  // Al editar: campos existentes + nuevos que el usuario agrega
  const [camposNuevos, setCamposNuevos] = useState<CampoSchema[]>(
    esEdicion ? [] : [{ ...CAMPO_VACÍO, requerido: true }]
  );
  const [opcionesTexto, setOpcionesTexto] = useState<Record<number, string>>({});

  function updateCampoActual(i: number, key: keyof CampoSchema, val: string | boolean | string[]) {
    setCamposActuales(p => {
      const next = p.map((c, idx) => {
        if (idx !== i) return c;
        const updated = { ...c, [key]: val } as CampoSchema;
        if (key === "label") {
          const used = new Set(p.filter((_, idx2) => idx2 !== i).map(campo => campo.nombre).filter(Boolean));
          updated.nombre = makeUniqueFieldName(String(val || ""), used, "campo");
        }
        return updated;
      });
      return next;
    });
  }
  function confirmarRemoverCampoActual() {
    if (campoAEliminar === null) return;
    const idx = campoAEliminar;
    setCamposActuales(p => p.filter((_, i) => i !== idx));
    setOpcionesTextoActuales(p => Object.fromEntries(
      Object.entries(p)
        .filter(([key]) => Number(key) !== idx)
        .map(([key, value]) => [Number(key) > idx ? Number(key) - 1 : Number(key), value])
    ));
    setCampoAEliminar(null);
  }
  function addCampo() {
    setCamposNuevos(p => [...p, { ...CAMPO_VACÍO }]);
  }
  function removeCampoNuevo(i: number) {
    setCamposNuevos(p => p.filter((_, idx) => idx !== i));
    setOpcionesTexto(p => Object.fromEntries(
      Object.entries(p)
        .filter(([key]) => Number(key) !== i)
        .map(([key, value]) => [Number(key) > i ? Number(key) - 1 : Number(key), value])
    ));
  }
  function updateCampoNuevo(i: number, key: keyof CampoSchema, val: string | boolean | string[]) {
    setCamposNuevos(p => p.map((c, idx) => {
      if (idx !== i) return c;
      const next = { ...c, [key]: val } as CampoSchema;
      if (key === "label") {
        const used = new Set(p.filter((_, idx2) => idx2 !== i).map(campo => campo.nombre).filter(Boolean));
        next.nombre = makeUniqueFieldName(String(val || ""), used, "campo");
      }
      return next;
    }));
  }

  async function handleImageFile(file: File) {
    if (!file) return;
    setErrorImagen("");
    setSubiendoImagen(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/categorias/upload-icon", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "No se pudo subir la imagen");
      setIcono(json.url);
    } catch (e) {
      setErrorImagen(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setSubiendoImagen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const camposActualesNormalizados = camposActuales.map((campo, i) => ({
      ...campo,
      opciones: campo.tipo === "select"
        ? (opcionesTextoActuales[i] ?? campo.opciones?.join(", ") ?? "")
            .split(",").map(opcion => opcion.trim()).filter(Boolean)
        : undefined,
    }));
    const camposNuevosNormalizados = camposNuevos.map((campo, i) => ({
      ...campo,
      opciones: campo.tipo === "select"
        ? (opcionesTexto[i] ?? campo.opciones?.join(", ") ?? "")
            .split(",").map(opcion => opcion.trim()).filter(Boolean)
        : undefined,
    }));
    const todosLosCampos = [...camposActualesNormalizados, ...camposNuevosNormalizados];
    if (!todosLosCampos.length) return;
    if (!icono.trim()) {
      onGuardar({ nombre: nombre.trim(), icono: "/icon-192.png", color, campos: todosLosCampos });
      return;
    }
    onGuardar({ nombre: nombre.trim(), icono, color, campos: todosLosCampos });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
      <h3 className="font-bold text-slate-800 text-lg">
        {esEdicion ? `Editar: ${inicial?.nombre}` : "Nueva categoría"}
      </h3>

      {/* Nombre */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Nombre <span className="text-red-400">*</span>
        </label>
        <input value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="ej: Conos, Retazos, Pinturas..."
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Imagen representativa */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Imagen representativa</label>
          <div className="space-y-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              {icono ? (
                <img src={normalizeCategoryIcon(icono) ?? "/icon-192.png"} alt={nombre || "Categoría"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">Sin imagen</span>
              )}
            </div>
            <input
              type="url"
              value={icono}
              onChange={e => setIcono(e.target.value)}
              placeholder="https://.../categoria.png"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <input
              type="file"
              accept="image/*"
              disabled={subiendoImagen}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await handleImageFile(file);
              }}
              className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 file:font-medium hover:file:bg-sky-100 disabled:opacity-50"
            />
            {subiendoImagen && (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Subiendo imagen...
              </p>
            )}
            {errorImagen && (
              <p className="text-xs text-red-600">{errorImagen}</p>
            )}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Color</label>
          <div className="flex flex-wrap gap-2.5">
            {COLORES.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-4 transition-all ${
                  color === c ? "border-slate-700 scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>

      {/* Campos existentes — editables y eliminables */}
      {esEdicion && camposActuales.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Campos actuales</p>
          <div className="space-y-2">
            {camposActuales.map((campo, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={campo.label}
                    onChange={e => updateCampoActual(i, "label", e.target.value)}
                    placeholder="Nombre del campo"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                  <select
                    value={campo.tipo}
                    onChange={e => updateCampoActual(i, "tipo", e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="select">Opciones</option>
                  </select>
                  <button type="button" onClick={() => setCampoAEliminar(i)}
                    className="text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                {campo.tipo === "select" && (
                  <input
                    value={opcionesTextoActuales[i] ?? campo.opciones?.join(", ") ?? ""}
                    onChange={e => {
                      const texto = e.target.value;
                      setOpcionesTextoActuales(p => ({ ...p, [i]: texto }));
                      updateCampoActual(i, "opciones", texto.split(",").map(s => s.trim()).filter(Boolean));
                    }}
                    placeholder="Opciones separadas por coma: bodega A, bodega B"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                )}

                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer w-fit">
                  <input type="checkbox" checked={campo.requerido}
                    onChange={e => updateCampoActual(i, "requerido", e.target.checked)}
                    className="rounded" />
                  Campo obligatorio
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campos nuevos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {esEdicion ? "Agregar nuevos campos" : "Campos del producto"}
            </p>
            {esEdicion && (
              <p className="text-xs text-slate-400">
                Los campos nuevos se agregan a los existentes
              </p>
            )}
          </div>
          <button type="button" onClick={addCampo}
            className="flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg">
            <Plus size={13} /> Agregar campo
          </button>
        </div>

        {camposNuevos.length === 0 && esEdicion && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-400">
              Toca "Agregar campo" para añadir nuevos campos a esta categoría
            </p>
          </div>
        )}

        <div className="space-y-2">
          {camposNuevos.map((campo, i) => (
            <div key={i} className="bg-sky-50 border border-sky-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full font-medium flex-shrink-0">Nuevo</span>
                <input
                  value={campo.label}
                  onChange={e => updateCampoNuevo(i, "label", e.target.value)}
                  placeholder="Nombre del campo (ej: Zona, Proveedor)"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <select
                  value={campo.tipo}
                  onChange={e => updateCampoNuevo(i, "tipo", e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="select">Opciones</option>
                </select>
                <button type="button" onClick={() => removeCampoNuevo(i)}
                  className="text-slate-300 hover:text-red-400 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {campo.tipo === "select" && (
                <input
                  value={opcionesTexto[i] ?? campo.opciones?.join(", ") ?? ""}
                  onChange={e => {
                    const texto = e.target.value;
                    setOpcionesTexto(p => ({ ...p, [i]: texto }));
                    updateCampoNuevo(i, "opciones", texto.split(",").map(s => s.trim()).filter(Boolean));
                  }}
                  placeholder="Opciones separadas por coma: bodega A, bodega B"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              )}

              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer w-fit">
                <input type="checkbox" checked={campo.requerido}
                  onChange={e => updateCampoNuevo(i, "requerido", e.target.checked)}
                  className="rounded" />
                Campo obligatorio
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0">
          <img src={normalizeCategoryIcon(icono) ?? "/icon-192.png"} alt={nombre || "Categoría"} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">{nombre || "Nombre de categoría"}</p>
          <p className="text-xs text-slate-400">
            {camposActuales.length + camposNuevos.length} campo(s) en total
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancelar}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit" disabled={guardando}
          className="flex-1 py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {guardando ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : "Guardar categoría"}
        </button>
      </div>

      <ConfirmDialog
        open={campoAEliminar !== null}
        title="¿Eliminar este campo?"
        description="Se quitará de la categoría. Los productos ya creados conservan su valor guardado, pero dejará de mostrarse y editarse."
        confirmLabel="Eliminar campo"
        onConfirm={confirmarRemoverCampoActual}
        onCancel={() => setCampoAEliminar(null)}
      />
    </form>
  );
}


/* ── Tarjeta de categoría ───────────────────────────────────── */
function CategoriaCard({
  cat, onEdit, onDelete, puedeGestionar,
}: {
  cat: Categoria;
  onEdit: (c: Categoria) => void;
  onDelete: (c: Categoria) => void;
  puedeGestionar: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
          <img src={normalizeCategoryIcon(cat.icono) ?? "/icon-192.png"} alt={cat.nombre} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800">{cat.nombre}</p>
          <p className="text-xs text-slate-400">
            {cat.campos?.length ?? 0} campos · {new Date(cat.fecha_creacion).toLocaleDateString("es-CL")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {puedeGestionar && (
            <>
              <button onClick={() => onEdit(cat)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => onDelete(cat)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
            </>
          )}
          <button onClick={() => setOpen(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
          <p className="text-xs font-medium text-slate-500 mb-2">Campos configurados:</p>
          <div className="flex flex-wrap gap-2">
            {cat.campos?.map(c => (
              <span key={c.nombre}
                className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {c.label}
                {c.requerido && <span className="text-red-400">*</span>}
                <span className="text-slate-300">· {c.tipo}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────── */
export default function CategoriasPage() {
  const { user, puede } = useAuth();
  const puedeGestionar = puede("gestionarCategorias");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modo, setModo]             = useState<"lista" | "crear" | "editar">("lista");
  const [editando, setEditando]     = useState<Categoria | null>(null);
  const [guardando, setGuardando]   = useState(false);
  const [error, setError]           = useState("");
  const [eliminando, setEliminando] = useState<Categoria | null>(null);
  const [eliminandoLoading, setEliminandoLoading] = useState(false);
  const [eliminandoError, setEliminandoError]     = useState("");

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/categorias");
    if (res.ok) setCategorias(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function handleGuardar(d: { nombre: string; icono: string; color: string; campos: CampoSchema[] }) {
    setError("");
    setGuardando(true);

    const url    = modo === "editar" ? `/api/categorias/${editando!.id}` : "/api/categorias";
    const method = modo === "editar" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Error al guardar");
      setGuardando(false);
      return;
    }
    setModo("lista");
    setEditando(null);
    fetch_();
    setGuardando(false);
  }

  async function handleDelete(cat: Categoria) {
    setEliminandoError("");
    setEliminando(cat);
  }

  async function confirmarDelete() {
    if (!eliminando) return;
    setEliminandoLoading(true);
    setEliminandoError("");
    const res = await fetch(`/api/categorias/${eliminando.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setEliminandoError(json.error ?? "Error al eliminar");
      setEliminandoLoading(false);
      return;
    }
    fetch_();
    setEliminandoLoading(false);
    setEliminando(null);
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="lg:hidden text-lg font-bold text-slate-800">Categorías</h2>
            <p className="text-sm text-slate-400">{categorias.length} categorías</p>
          </div>
          {modo === "lista" && puedeGestionar && (
            <button onClick={() => { setModo("crear"); setError(""); }}
              className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 shadow-sm">
              <Plus size={16} /> Nueva categoría
            </button>
          )}
        </div>

        {/* Formulario crear/editar */}
        {(modo === "crear" || modo === "editar") && (
          <CategoriaForm
            inicial={editando ?? undefined}
            onGuardar={handleGuardar}
            onCancelar={() => { setModo("lista"); setEditando(null); setError(""); }}
            guardando={guardando}
            error={error}
          />
        )}

        {/* Lista */}
        {modo === "lista" && (
          loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin categorías aún</p>
              {puedeGestionar && (
                <button onClick={() => setModo("crear")}
                  className="text-sm text-sky-500 mt-2 hover:underline">
                  Crear la primera
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {categorias.map(cat => (
                <CategoriaCard key={cat.id} cat={cat}
                  onEdit={c => { setEditando(c); setModo("editar"); setError(""); }}
                  onDelete={handleDelete}
                  puedeGestionar={puedeGestionar}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal confirmación eliminar */}
      <ConfirmDialog
        open={!!eliminando}
        title={eliminando ? `¿Eliminar "${eliminando.nombre}"?` : ""}
        description="Esta acción no se puede deshacer."
        detail="Solo se puede eliminar si no tiene productos asociados."
        error={eliminandoError}
        loading={eliminandoLoading}
        confirmLabel="Eliminar"
        onConfirm={confirmarDelete}
        onCancel={() => !eliminandoLoading && setEliminando(null)}
      />
    </AppShell>
  );
}
