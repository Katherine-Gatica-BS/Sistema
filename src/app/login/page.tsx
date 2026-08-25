"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { nombreAEmail } from "@/lib/usuario-email";
import { LogoCortinaqr } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const [modo, setModo] = useState<"login" | "recuperar">("login");

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [recuperarUsuario, setRecuperarUsuario] = useState("");
  const [recuperarLoading, setRecuperarLoading] = useState(false);
  const [recuperarError, setRecuperarError] = useState("");
  const [recuperarEnviado, setRecuperarEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!usuario || !password) {
      setError("Completa todos los campos");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Acepta tanto "usuario" simple como un correo completo (por compatibilidad).
    const email = usuario.includes("@") ? usuario : nombreAEmail(usuario);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Mensaje en español para los errores más comunes
      if (authError.message.includes("Invalid login credentials")) {
        setError("Usuario o contraseña incorrectos");
      } else if (authError.message.includes("Email not confirmed")) {
        setError("Debes confirmar tu correo antes de ingresar");
      } else {
        setError("Error al iniciar sesión. Intenta nuevamente.");
      }
      setLoading(false);
      return;
    }

    // Redirigir a la URL original (ej: /scan?id=xxx) o al home
    router.push(redirectTo);
    router.refresh();
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault();
    setRecuperarError("");

    if (!recuperarUsuario.trim()) {
      setRecuperarError("Ingresa tu usuario o correo");
      return;
    }

    setRecuperarLoading(true);
    const supabase = createClient();
    const email = recuperarUsuario.includes("@") ? recuperarUsuario : nombreAEmail(recuperarUsuario);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Siempre mostramos éxito (aunque el usuario no exista) para no filtrar qué cuentas existen.
    setRecuperarLoading(false);
    setRecuperarEnviado(true);
  }

  if (modo === "recuperar") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <MailCheck size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Recuperar contraseña</h1>
            <p className="text-slate-500 text-sm mt-1">
              Te enviaremos un enlace a tu correo registrado para crear una nueva contraseña.
            </p>
          </div>

          {recuperarEnviado ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 text-center">
              <p className="text-sm text-slate-600">
                Si tu usuario tiene un correo válido registrado, te llegará un mensaje con las instrucciones para cambiar tu contraseña.
              </p>
              <button
                onClick={() => { setModo("login"); setRecuperarEnviado(false); setRecuperarUsuario(""); }}
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={15} /> Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecuperar} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Usuario o correo</label>
                <input
                  type="text"
                  value={recuperarUsuario}
                  onChange={(e) => setRecuperarUsuario(e.target.value)}
                  placeholder="tu usuario"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                />
              </div>

              {recuperarError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {recuperarError}
                </p>
              )}

              <button
                type="submit"
                disabled={recuperarLoading}
                className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {recuperarLoading ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : "Enviar enlace"}
              </button>
              <button
                type="button"
                onClick={() => setModo("login")}
                className="w-full text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={13} /> Volver a iniciar sesión
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden lg:flex relative items-center justify-center bg-slate-900 p-12">
            <div className="max-w-md text-center text-white">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-amber-400/40 bg-slate-800">
                <LogoCortinaqr size={64} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Sistema de inventario</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight">
                <span className="text-white">CORTINA</span> <span className="text-amber-400">QR</span>
              </h1>
              <p className="mt-3 text-lg font-medium text-slate-200">INVENTARIO</p>
              <p className="mt-6 text-sm leading-6 text-slate-300">
                Controla stock, escanea productos y organiza tu inventario desde una sola plataforma.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-8 lg:p-12">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-900 shadow-sm lg:mx-0">
                  <LogoCortinaqr size={42} />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">CORTINA QR</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">INVENTARIO</p>
              </div>

              <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Usuario
                    </label>
                    <input
                      type="text"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      placeholder="tu usuario"
                      autoComplete="username"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-slate-500">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => setModo("recuperar")}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Ingresando...
                      </>
                    ) : (
                      "Iniciar sesión"
                    )}
                  </button>
                </div>
              </form>

              <p className="mt-5 text-center text-xs text-slate-400">
                ¿Sin acceso? Contacta al administrador.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="text-brand-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
