import Link from "next/link";
import { PackageSearch, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
          <PackageSearch size={28} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Página no encontrada</h1>
          <p className="text-sm text-slate-500 mt-1">
            El contenido que buscas no existe o fue movido.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition-colors"
        >
          <Home size={15} /> Volver al inicio
        </Link>
      </div>
    </div>
  );
}
