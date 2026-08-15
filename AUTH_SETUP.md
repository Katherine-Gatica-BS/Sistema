# 🔐 Guía de configuración — Autenticación con Supabase

## Paso 1 — Configurar Supabase Auth

### 1.1 Habilitar el proveedor Email/Password

1. Abre tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **Authentication → Providers**
3. Asegúrate de que **Email** esté habilitado (viene activado por defecto)
4. Opcional: desactiva "Confirm email" si quieres que los usuarios puedan ingresar sin confirmar correo (útil para MVPs internos)

### 1.2 Crear el primer usuario autorizado

**Opción A — Desde el dashboard (recomendado para MVP):**

1. Ve a **Authentication → Users**
2. Click en **"Add user"** → **"Create new user"**
3. Ingresa el correo y contraseña del operario
4. Repite para cada persona autorizada

**Opción B — Invitación por correo:**

1. Ve a **Authentication → Users**
2. Click en **"Invite user"**
3. El usuario recibe un correo con link para crear su contraseña

---

## Paso 2 — Ejecutar el SQL con RLS

1. Ve a **SQL Editor** en tu proyecto de Supabase
2. Pega el contenido completo de `database.sql`
3. Click **"Run"**

Esto configura las políticas RLS:

| Operación | Quién puede |
|-----------|------------|
| SELECT (leer) | Cualquiera (público) |
| INSERT (crear conos) | Usuarios autenticados |
| UPDATE (marcar usado) | Usuarios autenticados |
| DELETE (eliminar) | Usuarios autenticados |

---

## Paso 3 — Variables de entorno

En tu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

En **Vercel**, agregar las mismas variables en **Settings → Environment Variables**.

---

## Paso 4 — Configurar URL de redirección en Supabase

Para que los magic links y confirmaciones funcionen correctamente:

1. Ve a **Authentication → URL Configuration**
2. En **Site URL**: ingresa `https://tu-app.vercel.app`
3. En **Redirect URLs**: agrega `https://tu-app.vercel.app/**`

---

## Flujo de autenticación (cómo funciona)

```
Usuario escanea QR
        ↓
/scan?id=uuid
        ↓
Middleware revisa cookie de sesión
        ↓
¿Tiene sesión? ─── NO ──→ /login?redirectTo=/scan?id=uuid
        │                         ↓
       SÍ              Usuario ingresa credenciales
        ↓                         ↓
API PATCH /api/cones/[id]    Supabase valida
        ↓                         ↓
Verifica auth (doble capa)   Sesión guardada en cookie
        ↓                         ↓
Supabase RLS valida          Redirige a /scan?id=uuid
        ↓                         ↓
Actualiza estado              Procesa el cono
```

---

## Seguridad en capas

El sistema tiene **3 capas de seguridad** para que nadie pueda marcar un cono sin autorización:

1. **Middleware Next.js** — redirige a /login antes de que cargue la página
2. **API Route** — verifica `supabase.auth.getUser()` antes de ejecutar el UPDATE
3. **Supabase RLS** — la base de datos rechaza el UPDATE si no hay sesión válida

Incluso si alguien llama directamente a la API sin pasar por el frontend, la RLS lo bloquea.

---

## Restringir creación a administradores (opcional)

Si quieres que solo ciertos usuarios puedan **crear** conos, puedes usar metadatos de usuario:

### En Supabase Dashboard:

1. Ve a **Authentication → Users**
2. Click en el usuario que quieres hacer admin
3. En el campo **"User Metadata"**, agrega:
```json
{ "role": "admin" }
```

### Luego actualiza la política de INSERT en el SQL:

```sql
-- Reemplaza la política "insercion_autenticada" por esta:
DROP POLICY IF EXISTS "insercion_autenticada" ON conos;

CREATE POLICY "insercion_solo_admin"
  ON conos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'user_metadata'::text like '%admin%'
  );
```

---

## Comandos útiles

```bash
# Instalar dependencias nuevas
npm install

# Verificar que todo compila
npm run build

# Desarrollo local
npm run dev
```
