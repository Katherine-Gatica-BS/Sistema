"use client";

import { useState, useEffect } from "react";
import { X, Plus, Loader2, AlertCircle } from "lucide-react";
import { Categoria } from "@/lib/supabase";
import { normalizeCategoryIcon } from "@/lib/category-icon";

interface Props {
  categorias: Categoria[];
  onCreated: () => void;
  onClose: () => void;
  defaultCategoriaId?: string;
}

// Ícono de categoría — imagen o emoji
function CatIcon({ icono, nombre, size = 28 }: { icono: string; nombre: string; size?: number }) {
  const src = normalizeCategoryIcon(icono);
  if (src) {
    return <img src={src} alt={nombre} style={{ width: size, height: size }} className="rounded object-cover flex-shrink-0" />;
  }
  return <span style={{ fontSize: size * 0.6 }}>{icono ?? "📦"}</span>;
}

export function CreateItemForm({ categorias, onCreated, onClose, defaultCategoriaId }: Props) {
  const [categoriaId, setCategoriaId] = useState(defaultCategoriaId ?? categorias[0]?.id ?? "");
  const [atributos, setAtributos]     = useState<Record<string, string>>({});
  const [cantidad, setCantidad]       = useState("1");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  // La categoría seleccionada — con sus campos
  const categoria = categorias.find(c => c.id === categoriaId);
  // Campos seguros — nunca null
  const campos = Array.isArray(categoria?.campos) ? categoria!.campos : [];

  // Limpiar atributos al cambiar categoría
  function handleCatChange(id: string) {
    setCategoriaId(id);
    setAtributos({});
    setError("");
  }

  function setAttr(nombre: string, valor: string) {
    setAtributos(p => ({ ...p, [nombre]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!categoriaId) { setError("Selecciona una categoría"); return; }

    const faltantes = campos.filter(c => c.requerido && !atributos[c.nombre]?.trim());
    if (faltantes.length) {
      setError(`Completa los campos obligatorios: ${faltantes.map(c => c.label).join(", ")}`);
      return;
    }

    // Filtrar atributos vacíos — no guardar campos sin valor
    const atributosLimpios = Object.fromEntries(
      Object.entries(atributos).filter(([, v]) => v?.trim())
    );

    setLoading(true);
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoria_id: categoriaId, atributos: atributosLimpios, cantidad }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Error al guardar. Revisa la consola.");
      setLoading(false);
      return;
    }
    onCreated();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-slate-800 text-lg">Crear QR — Nuevo producto</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Selector de categoría */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Categoría <span className="text-red-400">*</span>
          </label>
          {categorias.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              No hay categorías. Crea una primero en la sección "Categorías".
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categorias.map(cat => (
                <button key={cat.id} type="button"
                  onClick={() => handleCatChange(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    categoriaId === cat.id
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <CatIcon icono={cat.icono} nombre={cat.nombre} size={24} />
                  {cat.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aviso si la categoría no tiene campos configurados */}
        {categoria && campos.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
            <AlertCircle size={16} />
            Esta categoría no tiene campos configurados. Ve a "Categorías" y agrégale campos.
          </div>
        )}

        {/* Campos dinámicos */}
        {campos.map(campo => (
          <div key={campo.nombre}>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              {campo.label}
              {campo.requerido && <span className="text-red-400 ml-1">*</span>}
            </label>

            {campo.tipo === "select" ? (
              <select
                value={atributos[campo.nombre] ?? ""}
                onChange={e => setAttr(campo.nombre, e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="">— Selecciona {campo.label} —</option>
                {(campo.opciones ?? []).map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            ) : (
              <input
                type={campo.tipo === "number" ? "number" : "text"}
                value={atributos[campo.nombre] ?? ""}
                onChange={e => setAttr(campo.nombre, e.target.value)}
                placeholder={`Ingresa ${campo.label.toLowerCase()}`}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            )}
          </div>
        ))}

        {/* Cantidad */}
        {campos.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cantidad</label>
            <input
              type="number" min="1" value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button type="submit"
          disabled={loading || !categoria || campos.length === 0}
          className="w-full py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
            : <><Plus size={16} /> Guardar y generar QR</>
          }
        </button>
      </form>
    </div>
  );
}
