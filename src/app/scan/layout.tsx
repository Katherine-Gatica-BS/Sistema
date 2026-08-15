import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={40} className="text-sky-500 animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  );
}
