// Login por nombre de usuario simple — Supabase Auth exige un email,
// así que se genera uno interno con este dominio. Usado tanto en el
// login (cliente) como al crear usuarios (API).
export const DOMINIO_USUARIO_INTERNO = "cono-app.local";

export function nombreAEmail(nombre: string) {
  const slug = nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
  return `${slug}@${DOMINIO_USUARIO_INTERNO}`;
}
