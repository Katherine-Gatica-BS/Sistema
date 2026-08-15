"use client";

export function LogoCortinaqr({ size = 36 }: { size?: number }) {
  // Versión compacta del logo para el header (solo ícono)
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" suppressHydrationWarning>
      <rect width="90" height="90" rx="18" fill="#1a2744"/>
      <rect width="90" height="90" rx="18" fill="none" stroke="#c9a84c" strokeWidth="2"/>
      {/* Barra */}
      <rect x="12" y="16" width="66" height="6" rx="3" fill="#c9a84c"/>
      <circle cx="13" cy="19" r="5" fill="#c9a84c"/>
      <circle cx="77" cy="19" r="5" fill="#c9a84c"/>
      {/* Cortina */}
      <path d="M15 22 Q18 45 23 52 Q26 58 22 70 L15 70 Z" fill="#0f1a35" stroke="#2a3a5e" strokeWidth="0.5"/>
      <path d="M23 22 Q30 45 32 52 Q35 58 28 70 L22 70 Q26 58 23 52 Q18 45 15 22 Z" fill="#162040"/>
      <path d="M22 48 Q26 52 30 48 Q28 55 24 56 Q20 55 22 48Z" fill="#c9a84c" opacity="0.8"/>
      {/* Marco QR */}
      <rect x="34" y="26" width="40" height="40" rx="5" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
      <rect x="36" y="28" width="10" height="10" rx="2" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
      <rect x="58" y="28" width="10" height="10" rx="2" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
      <rect x="36" y="50" width="10" height="10" rx="2" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
      <rect x="40" y="32" width="4" height="4" rx="0.5" fill="#c9a84c"/>
      <rect x="62" y="32" width="4" height="4" rx="0.5" fill="#c9a84c"/>
      <rect x="40" y="54" width="4" height="4" rx="0.5" fill="#c9a84c"/>
      <rect x="50" y="38" width="3" height="3" fill="#c9a84c"/>
      <rect x="55" y="38" width="3" height="3" fill="#c9a84c"/>
      <rect x="50" y="43" width="3" height="3" fill="#c9a84c"/>
      <rect x="55" y="43" width="3" height="3" fill="#c9a84c"/>
      <rect x="50" y="48" width="3" height="3" fill="#c9a84c"/>
      <rect x="60" y="48" width="3" height="3" fill="#c9a84c"/>
    </svg>
  );
}

export function LogoCortinaqrHorizontal() {
  return (
    <div className="flex items-center gap-3">
      <LogoCortinaqr size={36} />
      <div>
        <p className="text-sm font-bold text-white leading-tight tracking-wide">
          CORTINA <span className="text-amber-400">QR</span>
        </p>
        <p className="text-xs text-slate-400 tracking-widest">INVENTARIO</p>
      </div>
    </div>
  );
}
