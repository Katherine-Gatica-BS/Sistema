"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, Tag, LogOut, ChevronRight, QrCode } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LogoCortinaqrHorizontal, LogoCortinaqr } from "@/components/Logo";

const NAV = [
  { href: "/",           icon: LayoutDashboard, label: "Dashboard"  },
  { href: "/inventario", icon: Package,          label: "Inventario" },
  { href: "/categorias", icon: Tag,              label: "Categorías" },
  { href: "/scan",       icon: QrCode,           label: "Escanear"   },
];

function ClientDate() {
  const [fecha, setFecha] = useState("");
  useEffect(() => {
    setFecha(new Date().toLocaleDateString("es-CL", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    }));
  }, []);
  return <p className="text-xs text-slate-400">{fecha}</p>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, signOut } = useAuth();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── SIDEBAR — solo desktop ───────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 bg-slate-900 fixed inset-y-0 left-0 z-30">
        {/* Brand */}
        <div className="px-5 py-6 border-b border-slate-700/50">
          <LogoCortinaqrHorizontal />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-xs font-medium text-slate-500 px-3 pb-2 uppercase tracking-wider">Principal</p>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2 ${
                  active
                    ? "bg-sky-500/15 text-sky-400 border-sky-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800 border-transparent"
                }`}
              >
                <Icon size={17} />
                {label}
                {active && <ChevronRight size={13} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-slate-700/50 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{user.email}</p>
              </div>
              <button onClick={handleSignOut} title="Cerrar sesión"
                className="text-slate-500 hover:text-red-400 transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          )}
          <div className="px-2 pt-2 border-t border-slate-700/40">
            <p className="text-xs text-slate-500 mb-1">Soporte técnico</p>
            <a href="tel:+56934007366"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors">
              +56 9 3400 7366
            </a>
          </div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-56 min-h-screen">

        {/* Desktop topbar */}
        <header className="hidden lg:flex bg-white border-b border-slate-100 px-6 py-3.5 items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-base font-semibold text-slate-800">
              {NAV.find(n => n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))?.label ?? "Cortina QR"}
            </h1>
            <ClientDate />
          </div>
          {user && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-xs text-white font-semibold">
                {initials}
              </div>
              <span className="max-w-xs truncate">{user.email}</span>
            </div>
          )}
        </header>

        {/* Mobile topbar — sin hamburguesa */}
        <header className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2">
            <LogoCortinaqr size={28} />
            <div>
              <span className="text-sm font-bold text-slate-800 tracking-wide">CORTINA <span className="text-amber-500">QR</span></span>
            </div>
          </div>
          {user && (
            <button onClick={handleSignOut}
              className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-semibold text-white">
              {initials}
            </button>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 pb-20 lg:pb-8">
          {children}
        </main>

        {/* ── BOTTOM NAV — solo mobile ─────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 z-20 safe-bottom">
          <div className="flex">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                    active ? "text-sky-500" : "text-slate-400"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                </Link>
              );
            })}
          </div>
          {/* Soporte visible en mobile */}
          <div className="border-t border-slate-100 py-1.5 px-4 flex items-center justify-center gap-1.5">
            <span className="text-xs text-slate-400">Soporte:</span>
            <a href="tel:+56934007366" className="text-xs text-sky-500 font-medium">
              +56 9 3400 7366
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
