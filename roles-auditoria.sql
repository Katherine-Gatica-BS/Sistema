-- ═══════════════════════════════════════════════════════════════
-- Roles de usuario + registro de auditoría
-- Ejecutar en el SQL Editor de Supabase (después de crear al usuario
-- master de Auth — ver instrucciones al final del archivo).
-- ═══════════════════════════════════════════════════════════════

    -- Perfil de cada usuario de Auth: nombre visible + rol de permisos.
    create table if not exists perfiles (
    id             uuid primary key references auth.users(id) on delete cascade,
    nombre         text not null,
    rol            text not null check (rol in ('master', 'editor', 'viewer', 'scanner')),
    fecha_creacion timestamptz not null default now()
    );

    alter table perfiles enable row level security;

    -- Cada usuario autenticado puede leer su propio perfil (para saber su rol en el cliente).
    drop policy if exists "perfiles_select_propio" on perfiles;
    create policy "perfiles_select_propio"
    on perfiles for select
    to authenticated
    using (auth.uid() = id);

    -- El resto de operaciones (crear/editar/eliminar perfiles de otros) se hacen
    -- siempre desde la API con la service_role key, que ignora RLS.

    -- ───────────────────────────────────────────────────────────────
    -- Registro de auditoría: quién hizo qué y cuándo.
    create table if not exists auditoria (
    id             uuid primary key default gen_random_uuid(),
    usuario_id     uuid references auth.users(id) on delete set null,
    usuario_nombre text not null,
    accion         text not null,   -- 'crear' | 'editar' | 'eliminar' | 'marcar_usado'
    entidad        text not null,   -- 'item' | 'categoria' | 'usuario'
    entidad_id     text,
    detalle        jsonb,
    fecha          timestamptz not null default now()
    );

    alter table auditoria enable row level security;
    -- Sin políticas: solo accesible desde la API vía service_role (bypassa RLS).

    create index if not exists auditoria_fecha_idx on auditoria (fecha desc);

-- ═══════════════════════════════════════════════════════════════
-- Cómo crear al usuario master (una sola vez):
--
-- 1. Ve a Authentication → Users → Add user, en tu proyecto Supabase.
-- 2. Email:    sistemas.linda@gmail.com
--    Password: L1cl26i1n$
--    Marca "Auto Confirm User" si aparece la opción.
-- 3. Copia el UUID del usuario recién creado y ejecuta:
--
--    insert into perfiles (id, nombre, rol)
--    values ('PEGA-AQUI-EL-UUID', 'Linda', 'master');
--
-- Como el nombre ya es un correo real, en el login se ingresa tal cual
-- (el campo "Usuario" acepta tanto un nombre simple como un correo completo).
--
-- Desde la app, este usuario master podrá crear/eliminar al resto de
-- usuarios y asignarles rol (editor, viewer o scanner) sin tocar Supabase.
-- ═══════════════════════════════════════════════════════════════
