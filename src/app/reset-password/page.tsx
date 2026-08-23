"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [sesionValida, setSesionValida] = useState<boolean | null>(null);

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    // El enlace del correo crea una sesión temporal de "recuperación" en el cliente.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesionValida(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSesionValida(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 4) { setError("La contraseña debe tener al menos 4 caracteres"); return; }
    if (password !== confirmar) { setError("Las contraseñas no coinciden"); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("No se pudo actualizar la contraseña. El enlace puede haber expirado — solicita uno nuevo.");
      return;
    }

    setListo(true);
    setTimeout(() => router.push("/"), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <KeyRound size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Nueva contraseña</h1>
          <p className="text-slate-500 text-sm mt-1">Ingresa tu nueva contraseña para continuar</p>
        </div>

        {listo ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center space-y-3">
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
            <p className="text-sm text-slate-600">Contraseña actualizada. Redirigiendo...</p>
          </div>
        ) : sesionValida === false ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center space-y-3">
            <p className="text-sm text-red-600">
              Este enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Confirmar contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
