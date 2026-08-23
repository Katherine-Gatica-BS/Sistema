"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Plus, Search, Printer, CheckSquare, Square, X, QrCode, Camera, Trash2 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ItemCard } from "@/components/ItemCard";
import { CreateItemForm } from "@/components/CreateItemForm";
import { PrintPreviewModal } from "@/components/PrintPreviewModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Item, Categoria } from "@/lib/supabase";
import { normalizeCategoryIcon } from "@/lib/category-icon";
import { useAuth } from "@/lib/auth-context";

type Tab = "disponible" | "usado";

function InventarioContent() {
  const searchParams = useSearchParams();
  const catParam     = searchParams.get("cat");
  const { puede } = useAuth();
  const puedeGestionar = puede("gestionarItems");

  const [items, setItems]           = useState<Item[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>("disponible");
  const [showForm, setShowForm]     = useState(false);
  const [catFiltro, setCatFiltro]   = useState(catParam ?? "");
  const [busqueda, setBusqueda]     = useState("");
  const [apiError, setApiError]     = useState("");

  // Selección múltiple para impresión y eliminación
  const [modoSeleccion, setModoSeleccion]       = useState(false);
  const [seleccionados, setSeleccionados]       = useState<Set<string>>(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showBulkDelete, setShowBulkDelete]     = useState(false);
  const [bulkDeleting, setBulkDeleting]         = useState(false);
  const [bulkDeleteError, setBulkDeleteError]   = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const [ir, cr] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/categorias"),
      ]);

      const categoriasData = cr.ok ? await cr.json() : [];
      const categoriasList: Categoria[] = Array.isArray(categoriasData) ? categoriasData : [];
      const categoriasPorId = new Map(categoriasList.map(c => [c.id, c]));
      setCategorias(categoriasList);

      if (!ir.ok) {
        const e = await ir.json().catch(() => ({}));
        setApiError(`Error: ${e.error ?? ir.status}. Revisa las variables de entorno en .env.local`);
      } else {
        const data = await ir.json();
        // Normalizar items — algunos pueden tener atributos null (datos migrados)
        // y adjuntar su categoría desde la lista ya cargada (evita duplicar íconos por ítem)
        const normalized = (Array.isArray(data) ? data : []).map((item: Item) => ({
          ...item,
          atributos: item.atributos ?? {},
          cantidad:  item.cantidad  ?? 1,
          categoria: categoriasPorId.get(item.categoria_id),
        }));
        setItems(normalized);
      }
    } catch (e: any) {
      setApiError(`Error de red: ${e?.message ?? "desconocido"}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtrado seguro
  const filtrados = items.filter(item => {
    if (item.estado !== tab) return false;
    if (catFiltro && item.categoria_id !== catFiltro) return false;
    if (busqueda) {
      const texto = Object.values(item.atributos ?? {}).join(" ").toLowerCase();
      if (!texto.includes(busqueda.toLowerCase())) return false;
    }
    return true;
  });

  const disponibles = items.filter(i => i.estado === "disponible");
  const usados      = items.filter(i => i.estado === "usado");

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function seleccionarTodos() { setSeleccionados(new Set(filtrados.map(i => i.id))); }
  function deseleccionarTodos() { setSeleccionados(new Set()); }
  function salirModoSeleccion() { setModoSeleccion(false); setSeleccionados(new Set()); }

  const itemsSeleccionados = items.filter(i => seleccionados.has(i.id));

  async function confirmarEliminarSeleccionados() {
    setBulkDeleting(true);
    setBulkDeleteError("");
    try {
      const resultados = await Promise.all(
        itemsSeleccionados.map(item => fetch(`/api/items/${item.id}`, { method: "DELETE" }))
      );
      const fallos = resultados.filter(r => !r.ok).length;
      if (fallos > 0) {
        setBulkDeleteError(`No se pudieron eliminar ${fallos} de ${resultados.length} producto(s)`);
        setBulkDeleting(false);
        fetchData();
        return;
      }
      setShowBulkDelete(false);
      setBulkDeleting(false);
      salirModoSeleccion();
      fetchData();
    } catch (e: any) {
      setBulkDeleteError(e?.message ?? "Error al eliminar los productos");
      setBulkDeleting(false);
    }
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="lg:hidden text-lg font-bold text-slate-800">Inventario</h2>
            <p className="text-sm text-slate-400">{items.length} ítems en total</p>
          </div>

          <div className="flex items-center gap-2">
            {!modoSeleccion ? (
              <>
                <button
                  onClick={() => { setModoSeleccion(true); setShowForm(false); }}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <CheckSquare size={15} />
                  <span className="hidden sm:inline">Seleccionar</span>
                </button>
                {puedeGestionar && (
                  <button
                    onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 shadow-sm active:scale-95 transition-all"
                  >
                    <QrCode size={16} />
                    {showForm ? "Cancelar" : "Crear QR"}
                  </button>
                )}
                <Link
                  href="/scan"
                  className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 shadow-sm transition-all"
                >
                  <Camera size={16} />
                  <span className="hidden sm:inline">Escanear</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {seleccionados.size} sel.
                </span>
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
            )}
          </div>
        </div>

        {/* Acciones de lote — imprimir / eliminar */}
        {modoSeleccion && seleccionados.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrintPreview(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 shadow-sm"
            >
              <Printer size={16} />
              Imprimir {seleccionados.size} etiqueta{seleccionados.size !== 1 ? "s" : ""}
            </button>
            {puedeGestionar && (
              <button
                onClick={() => { setBulkDeleteError(""); setShowBulkDelete(true); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 shadow-sm"
              >
                <Trash2 size={16} />
                Eliminar {seleccionados.size}
              </button>
            )}
          </div>
        )}

        {modoSeleccion && seleccionados.size === 0 && (
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 text-sm text-sky-700 text-center">
            Toca los productos para seleccionarlos
          </div>
        )}

        {/* Error */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            ⚠️ {apiError}
          </div>
        )}

        {/* Formulario crear QR */}
        {showForm && !modoSeleccion && (
          <CreateItemForm
            categorias={categorias}
            defaultCategoriaId={catFiltro || undefined}
            onCreated={() => { fetchData(); setShowForm(false); }}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Filtros */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setCatFiltro("")}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                !catFiltro ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCatFiltro(cat.id === catFiltro ? "" : cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  catFiltro === cat.id ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                <CatFilterIcon icono={cat.icono} />
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(["disponible", "usado"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {t === "disponible" ? `Disponibles (${disponibles.length})` : `Usados (${usados.length})`}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
            <p className="text-slate-600 font-medium text-lg">Se está actualizando la información...</p>
            <p className="text-sm text-slate-400">Cargando inventario...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              No hay ítems {tab === "disponible" ? "disponibles" : "usados"}
              {busqueda && ` con "${busqueda}"`}
            </p>
            {items.length > 0 && filtrados.length === 0 && !busqueda && (
              <p className="text-xs text-slate-300 mt-2">
                Hay {items.length} ítems en total — cambia el filtro o el tab
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtrados.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                modoSeleccion={modoSeleccion}
                seleccionado={seleccionados.has(item.id)}
                onToggleSeleccion={toggleSeleccion}
                onDeleted={() => fetchData()}
              />
            ))}
          </div>
        )}
      </div>

      {showPrintPreview && (
        <PrintPreviewModal
          items={itemsSeleccionados}
          onClose={() => setShowPrintPreview(false)}
        />
      )}

      <ConfirmDialog
        open={showBulkDelete}
        title={`¿Eliminar ${seleccionados.size} producto${seleccionados.size !== 1 ? "s" : ""}?`}
        description="Esta acción no se puede deshacer."
        error={bulkDeleteError}
        loading={bulkDeleting}
        confirmLabel="Eliminar"
        requireTypedWord="eliminar"
        onConfirm={confirmarEliminarSeleccionados}
        onCancel={() => !bulkDeleting && setShowBulkDelete(false)}
      />
    </AppShell>
  );
}

// Ícono pequeño para los botones de filtro de categoría
function CatFilterIcon({ icono }: { icono: string }) {
  if (!icono) return null;
  const src = normalizeCategoryIcon(icono);
  if (src) {
    return <img src={src} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />;
  }
  return <span className="text-sm leading-none">{icono}</span>;
}

export default function InventarioPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center min-h-64">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    }>
      <InventarioContent />
    </Suspense>
  );
}
