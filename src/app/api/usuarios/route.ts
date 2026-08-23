import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { getUsuarioActual } from "@/lib/current-user";
import { registrarAuditoria } from "@/lib/audit";
import { ROLES, type Rol } from "@/lib/permissions";
import { nombreAEmail } from "@/lib/usuario-email";

export async function GET() {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (usuario.rol !== "master")
    return NextResponse.json({ error: "Solo el usuario master puede ver la lista de usuarios" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("perfiles").select("id, nombre, rol, fecha_creacion").order("fecha_creacion");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (usuario.rol !== "master")
    return NextResponse.json({ error: "Solo el usuario master puede crear usuarios" }, { status: 403 });

  const { nombre, password, rol } = await req.json().catch(() => ({}));

  if (!nombre?.trim() || !password?.trim())
    return NextResponse.json({ error: "Nombre y contraseña son requeridos" }, { status: 400 });
  if (password.length < 4)
    return NextResponse.json({ error: "La contraseña debe tener al menos 4 caracteres" }, { status: 400 });
  if (!ROLES.some(r => r.valor === rol))
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  const supabase = createServiceClient();
  const email = nombreAEmail(nombre);

  const { data: creado, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: nombre.trim() },
  });

  if (authError || !creado?.user) {
    const msg = authError?.message?.includes("already been registered")
      ? "Ya existe un usuario con ese nombre"
      : authError?.message?.includes("Bearer token")
      ? "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor — sin esa clave no se pueden crear usuarios."
      : (authError?.message ?? "No se pudo crear el usuario. Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurada.");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: perfilError } = await supabase
    .from("perfiles")
    .insert([{ id: creado.user.id, nombre: nombre.trim(), rol: rol as Rol }]);

  if (perfilError) {
    // Revertir: no dejar un usuario de Auth huérfano sin perfil.
    await supabase.auth.admin.deleteUser(creado.user.id);
    return NextResponse.json({ error: perfilError.message }, { status: 500 });
  }

  await registrarAuditoria({
    usuario_id: usuario.id, usuario_nombre: usuario.nombre,
    accion: "crear", entidad: "usuario", entidad_id: creado.user.id,
    detalle: { nombre: nombre.trim(), rol },
  });

  return NextResponse.json({ id: creado.user.id, nombre: nombre.trim(), rol }, { status: 201 });
}
