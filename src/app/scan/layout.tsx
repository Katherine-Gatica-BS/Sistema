import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 size={40} className="text-brand-500 animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
