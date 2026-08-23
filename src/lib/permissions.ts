// Roles y permisos del sistema. Único lugar de verdad para qué puede hacer cada rol.

export type Rol = "master" | "editor" | "viewer" | "scanner";

export const ROLES: { valor: Rol; label: string; descripcion: string }[] = [
  { valor: "master",  label: "Master",   descripcion: "Acceso total: gestiona usuarios, categorías e inventario." },
  { valor: "editor",  label: "Editor",   descripcion: "Puede crear, editar y eliminar categorías e ítems, y escanear." },
  { valor: "viewer",  label: "Visor",    descripcion: "Puede ver el inventario y escanear, pero no crear ni eliminar." },
  { valor: "scanner", label: "Escáner",  descripcion: "Solo puede acceder al escáner de QR." },
];

interface Permisos {
  gestionarUsuarios: boolean;
  verDashboard: boolean;
  verCategorias: boolean;
  gestionarItems: boolean;      // crear / eliminar ítems
  gestionarCategorias: boolean; // crear / editar / eliminar categorías
  escanear: boolean;
}

const MATRIZ: Record<Rol, Permisos> = {
  master:  { gestionarUsuarios: true,  verDashboard: true,  verCategorias: true,  gestionarItems: true,  gestionarCategorias: true,  escanear: true },
  editor:  { gestionarUsuarios: false, verDashboard: true,  verCategorias: true,  gestionarItems: true,  gestionarCategorias: true,  escanear: true },
  viewer:  { gestionarUsuarios: false, verDashboard: true,  verCategorias: true,  gestionarItems: false, gestionarCategorias: false, escanear: true },
  scanner: { gestionarUsuarios: false, verDashboard: false, verCategorias: false, gestionarItems: false, gestionarCategorias: false, escanear: true },
};

export function permisosDe(rol: Rol | null | undefined): Permisos {
  return MATRIZ[rol ?? "viewer"] ?? MATRIZ.viewer;
}

export function puede(rol: Rol | null | undefined, permiso: keyof Permisos): boolean {
  return permisosDe(rol)[permiso];
}

/** Ruta a la que se redirige a un rol si intenta entrar a una página sin permiso. */
export function rutaPorDefecto(rol: Rol | null | undefined): string {
  if (rol === "scanner") return "/scan";
  return "/";
}
