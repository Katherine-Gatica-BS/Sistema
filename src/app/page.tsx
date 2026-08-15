"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Package, TrendingUp, CheckCircle, Circle, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Item, Categoria } from "@/lib/supabase";
import { normalizeCategoryIcon } from "@/lib/category-icon";

export default function DashboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [itemsRes, catRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/categorias"),
    ]);
    if (itemsRes.ok) setItems(await itemsRes.json());
    if (catRes.ok) setCategorias(await catRes.json());
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
    { name: "Usados", value: usados.length, color: "#e2e8f0" },
  ];

  // Últimos 5
  const recientes = [...items].slice(0, 5);

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
          <KpiCard icon={<Package size={18} className="text-sky-600" />} label="Total ítems" value={items.length} delta={null} bg="bg-sky-100 border border-sky-200" />
          <KpiCard icon={<Circle size={18} className="text-emerald-600 fill-emerald-600" />} label="Disponibles" value={disponibles.length} delta={`${100 - tasaUso}% del stock`} bg="bg-emerald-100 border border-emerald-200" />
          <KpiCard icon={<CheckCircle size={18} className="text-slate-600" />} label="Usados" value={usados.length} delta={null} bg="bg-slate-200 border border-slate-300" />
          <KpiCard icon={<TrendingUp size={18} className="text-amber-600" />} label="Tasa de uso" value={`${tasaUso}%`} delta={null} bg="bg-amber-100 border border-amber-200" />
        </div>

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
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={porCategoria} barSize={18} barGap={3}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={22} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
                    formatter={(val, name) => [val, name === "disponible" ? "Disponible" : "Usado"]} />
                  <Bar dataKey="disponible" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="disponible" />
                  <Bar dataKey="usado" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="usado" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie estado */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-1">Estado del stock</h2>
            <p className="text-xs text-slate-400 mb-2">{tasaUso}% utilizado</p>
            {items.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-300 text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
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
              <div className="py-12 text-center text-slate-300 text-sm">Sin ítems aún</div>
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
                        <p className="text-sm font-semibold text-slate-800 font-mono truncate">#{item.id.slice(0, 16).toUpperCase()}</p>
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
            <h2 className="font-semibold text-slate-800 text-sm mb-3">Por categoría</h2>
            <div className="space-y-2">
              {categorias.length === 0 ? (
                <p className="text-xs text-slate-400">Sin categorías</p>
              ) : (
                categorias.map(cat => {
                  const stats = porCategoria.find(p => p.nombre === cat.nombre);
                  return (
                    <Link
                      key={cat.id}
                      href={`/inventario?cat=${cat.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                        <img src={normalizeCategoryIcon(cat.icono) ?? "/icon-192.png"} alt={cat.nombre} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{cat.nombre}</p>
                        <p className="text-xs text-slate-400">{stats?.disponible ?? 0} disponibles</p>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                    </Link>
                  );
                })
              )}
              {user && (
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

function KpiCard({ icon, label, value, delta, bg }: { icon: React.ReactNode; label: string; value: number | string; delta: string | null; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-4 flex items-center gap-3 shadow-sm`}>
      <div className="w-10 h-10 bg-white/80 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 border border-white/70">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-700 mt-0.5">{label}</p>
        {delta && <p className="text-xs text-emerald-700 mt-0.5">{delta}</p>}
      </div>
    </div>
  );
}
