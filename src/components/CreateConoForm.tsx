"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

interface CreateConoFormProps {
  onCreated: () => void;
}

const TIPOS = ["sunscreen", "roller", "duo", "blackout", "screen"];
const MEDIDAS = ["15m", "20m", "25m", "30m", "40m", "50m"];

export function CreateConoForm({ onCreated }: CreateConoFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ tipo: "", color: "", medida: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tipo || !form.color || !form.medida) {
      setError("Completa todos los campos");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/cones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Error al crear");
    } else {
      setForm({ tipo: "", color: "", medida: "" });
      setOpen(false);
      onCreated();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-brand-600 text-white font-semibold text-sm shadow-md hover:bg-brand-700 active:scale-95 transition-all"
      >
        <Plus size={18} />
        Agregar cono
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-800">Nuevo cono</h2>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Selecciona un tipo</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
          <input
            name="color"
            value={form.color}
            onChange={handleChange}
            placeholder="ej: blanco, beige, gris"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Medida</label>
          <select
            name="medida"
            value={form.medida}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Selecciona una medida</option>
            {MEDIDAS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Guardando..." : "Crear cono"}
        </button>
      </form>
    </div>
  );
}
