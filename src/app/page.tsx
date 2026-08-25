"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Package, TrendingUp, CheckCircle, Circle, Plus, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Item, Categoria } from "@/lib/supabase";
import { normalizeCategoryIcon } from "@/lib/category-icon";
import { generateProductCode } from "@/lib/product-code";

const BarraPorCategoria = dynamic(() => import("@/components/DashboardCharts").then(m => m.BarraPorCategoria), {
  ssr: false,
  loading: () => <div className="h-40 bg-slate-50 rounded-xl animate-pulse" />,
});
const PieEstado = dynamic(() => import("@/components/DashboardCharts").then(m => m.PieEstado), {
  ssr: false,
  loading: () => <div className="h-40 bg-slate-50 rounded-xl animate-pulse" />,
});

export default function DashboardPage() {
  const { puede } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstados, setFiltroEstados] = useState<Set<"disponible" | "usado">>(new Set());

  function toggleFiltro(estado: "disponible" | "usado") {
    setFiltroEstados(prev => {
      const next = new Set(prev);
      next.has(estado) ? next.delete(estado) : next.add(estado);
      return next;
    });
  }
  function quitarFiltro() {
    setFiltroEstados(new Set());
  }

  const fetchData = useCallback(async () => {
    const [itemsRes, catRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/categorias"),
    ]);
    const categoriasList: Categoria[] = catRes.ok ? await catRes.json() : [];
    setCategorias(categoriasList);
    if (itemsRes.ok) {
      // Adjuntar la categoría desde la lista ya cargada (evita duplicar íconos por ítem)
      const categoriasPorId = new Map(categoriasList.map(c => [c.id, c]));
      const data: Item[] = await itemsRes.json();
      setItems(data.map(item => ({ ...item, categoria: categoriasPorId.get(item.categoria_id) })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const disponibles = items.filter(i => i.estado === "disponible");
  const usados = items.filter(i => i.estado === "usado");
  const tasaUso = items.length > 0 ? Math.round((usados.length / items.length) * 100) : 0;

  // Por categoría
  const porCategoria = categorias.map(cat => ({
    nombre: cat.nombre,
    icono: cat.icono,
    disponible: items.filter(i => i.categoria_id === cat.id && i.estado === "disponible").length,
    usado: items.filter(i => i.categoria_id === cat.id && i.estado === "usado").length,
    total: items.filter(i => i.categoria_id === cat.id).length,
  }));

  const pieData = [
    { name: "Disponibles", value: disponibles.length, color: "#0ea5e9" },
    { name: "Usados", value: usados.length, color: "#64748b" },
  ];

  // Últimos 5 — respeta el filtro activo de las tarjetas KPI
  const itemsFiltrados = filtroEstados.size === 0
    ? items
    : items.filter(i => filtroEstados.has(i.estado));
  const recientes = [...itemsFiltrados].slice(0, 5);
  const hayFiltro = filtroEstados.size > 0;

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">

        {loading && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
            <p className="text-lg font-medium text-slate-600">Se está actualizando la información...</p>
            <p className="text-sm text-slate-400">Cargando dashboard...</p>
          </div>
        )}

        {!loading && (
        <>
        {/* Bienvenida mobile */}
        <div className="lg:hidden">
          <h2 className="text-lg font-bold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-400">{items.length} ítems registrados</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={<Package size={18} className="text-sky-600" />} label="Total ítems" value={items.length} delta={null}
            bg="bg-sky-50 border border-sky-200"
            selected={!hayFiltro}
            onClick={quitarFiltro}
          />
          <KpiCard
            icon={<Circle size={18} className="text-emerald-600 fill-emerald-600" />} label="Disponibles" value={disponibles.length} delta={`${100 - tasaUso}% del stock`}
            bg="bg-emerald-50 border border-emerald-200"
            selected={filtroEstados.has("disponible")}
            dimmed={hayFiltro && !filtroEstados.has("disponible")}
            onClick={() => toggleFiltro("disponible")}
          />
          <KpiCard
            icon={<CheckCircle size={18} className="text-slate-600" />} label="Usados" value={usados.length} delta={null}
            bg="bg-slate-100 border border-slate-300"
            selected={filtroEstados.has("usado")}
            dimmed={hayFiltro && !filtroEstados.has("usado")}
            onClick={() => toggleFiltro("usado")}
          />
          <KpiCard icon={<TrendingUp size={18} className="text-amber-600" />} label="Tasa de uso" value={`${tasaUso}%`} delta={null} bg="bg-amber-50 border border-amber-200" />
        </div>

        {hayFiltro && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">
              Mostrando: {Array.from(filtroEstados).map(e => e === "disponible" ? "Disponibles" : "Usados").join(" + ")}
            </span>
            <button
              onClick={quitarFiltro}
              className="flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X size={13} /> Quitar filtro
            </button>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar por categoría */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-1">Stock por categoría</h2>
            <p className="text-xs text-slate-400 mb-4">Disponibles vs usados</p>
            {loading ? (
              <div className="h-40 bg-slate-50 rounded-xl animate-pulse" />
            ) : porCategoria.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-300 text-sm">Sin datos aún</div>
            ) : (
              <BarraPorCategoria porCategoria={porCategoria} />
            )}
          </div>

          {/* Pie estado */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-1">Estado del stock</h2>
            <p className="text-xs text-slate-400 mb-2">{tasaUso}% utilizado</p>
            {items.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-300 text-sm">Sin datos</div>
            ) : (
              <PieEstado pieData={pieData} />
            )}
            <div className="space-y-1.5 mt-1">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-500">{d.name}</span>
                  </div>
                  <span className="font-semibold text-slate-700">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla recientes + acceso rápido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recientes */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm">Últimos registros</h2>
              <Link href="/inventario" className="text-xs text-sky-600 flex items-center gap-1 hover:underline">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />)}
              </div>
            ) : recientes.length === 0 ? (
              <div className="py-12 text-center text-slate-300 text-sm">
                {hayFiltro ? "Sin ítems para este filtro" : "Sin ítems aún"}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recientes.map(item => {
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                        {item.categoria?.icono ? (
                          <img src={normalizeCategoryIcon(item.categoria.icono) ?? "/icon-192.png"} alt={item.categoria.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">IMG</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 font-mono truncate">#{generateProductCode(item)}</p>
                        <p className="text-xs text-slate-400">{item.categoria?.nombre} · {new Date(item.fecha_creacion).toLocaleDateString("es-CL")}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        item.estado === "disponible" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {item.estado === "disponible" ? "Disponible" : "Usado"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acceso rápido por categoría */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-1">Por categoría</h2>
            <p className="text-xs text-slate-400 mb-3">{items.length} ítems en {categorias.length} categorías</p>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {categorias.length === 0 ? (
                <p className="text-xs text-slate-400">Sin categorías</p>
              ) : (
                categorias.map(cat => {
                  const stats = porCategoria.find(p => p.nombre === cat.nombre);
                  const total = stats?.total ?? 0;
                  const disp = stats?.disponible ?? 0;
                  const usad = stats?.usado ?? 0;
                  const pct = total > 0 ? Math.round((disp / total) * 100) : 0;
                  return (
                    <Link
                      key={cat.id}
                      href={`/inventario?cat=${cat.id}`}
                      className="block p-3 rounded-xl border border-slate-100 hover:border-sky-200 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                          <img src={normalizeCategoryIcon(cat.icono) ?? "/icon-192.png"} alt={cat.nombre} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{cat.nombre}</p>
                          <p className="text-[11px] text-slate-400">
                            {disp} disp. · {usad} usado{usad !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-slate-800 tabular-nums">{total}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  );
                })
              )}
              {puede("gestionarCategorias") && (
                <Link href="/categorias" className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:border-sky-300 hover:text-sky-600 transition-colors text-sm">
                  <Plus size={15} />
                  Nueva categoría
                </Link>
              )}
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </AppShell>
  );
}

function KpiCard({ icon, label, value, delta, bg, selected, dimmed, onClick }: {
  icon: React.ReactNode; label: string; value: number | string; delta: string | null; bg: string;
  selected?: boolean; dimmed?: boolean; onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`${bg} rounded-2xl p-4 flex items-center gap-3 shadow-sm text-left w-full transition-all ${
        clickable ? "hover:brightness-95 cursor-pointer" : "cursor-default"
      } ${dimmed ? "opacity-50" : ""} ${selected ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
    >
      <div className="w-10 h-10 bg-white/80 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 border border-white/70">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-700 mt-0.5">{label}</p>
        {delta && <p className="text-xs text-emerald-700 mt-0.5">{delta}</p>}
      </div>
    </button>
  );
}
