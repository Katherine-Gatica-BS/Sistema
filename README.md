# 📦 Inventario Conos

App PWA para gestionar inventario de conos (rollos de cortinas), con generación de QR y cambio de estado por escaneo.

---

## 🗂️ Estructura del proyecto

```
cono-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── cones/
│   │   │       ├── route.ts          ← GET (lista) y POST (crear)
│   │   │       └── [id]/route.ts     ← PATCH (marcar usado)
│   │   ├── scan/
│   │   │   ├── layout.tsx            ← Wrapper con Suspense
│   │   │   └── page.tsx              ← Página de escaneo QR
│   │   ├── globals.css
│   │   ├── layout.tsx                ← Layout raíz + PWA meta
│   │   └── page.tsx                  ← Dashboard principal
│   ├── components/
│   │   ├── Badge.tsx                 ← Chip disponible/usado
│   │   ├── ConoCard.tsx              ← Tarjeta de cono + QR
│   │   └── CreateConoForm.tsx        ← Formulario de creación
│   └── lib/
│       ├── supabase.ts               ← Cliente + types
│       └── qr.ts                     ← Generador de QR
├── public/
│   ├── manifest.json                 ← PWA manifest
│   ├── sw.js                         ← Service Worker
│   ├── register-sw.js                ← Registrador de SW
│   ├── icon-192.png                  ← ⚠️ Debes agregar este ícono
│   └── icon-512.png                  ← ⚠️ Debes agregar este ícono
├── database.sql                      ← Script SQL para Supabase
└── .env.example                      ← Variables de entorno
```

---

## 🚀 Instalación paso a paso

### Paso 1 — Clonar e instalar dependencias

```bash
git clone <tu-repo>
cd cono-app
npm install
```

### Paso 2 — Configurar Supabase

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y pega el contenido de `database.sql`, luego ejecuta
4. Ve a **Settings → API** y copia:
   - `Project URL`
   - `anon public` key

### Paso 3 — Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Paso 4 — Íconos PWA

Coloca dos íconos PNG en `public/`:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)

Puedes usar cualquier imagen cuadrada. Herramienta gratuita: [realfavicongenerator.net](https://realfavicongenerator.net)

### Paso 5 — Levantar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 📱 Cómo usar

1. **Crear cono**: toca "Agregar cono", completa los campos y guarda
2. **Ver QR**: en la tarjeta del cono, toca "Ver QR"
3. **Escanear QR**: desde un celular con la cámara o cualquier app de QR
4. **Resultado**: la página `/scan?id=...` marca el cono como usado automáticamente

---

## 🌐 Deploy en Vercel

### Opción A — Desde la interfaz de Vercel

1. Sube el proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) → "New Project"
3. Importa tu repositorio
4. En **Environment Variables**, agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` → `https://tu-app.vercel.app`
5. Click en **Deploy**

### Opción B — Desde terminal

```bash
npm i -g vercel
vercel login
vercel --prod
```

Durante el proceso, Vercel te pedirá las variables de entorno.

> ⚠️ **Importante**: después del deploy, actualiza `NEXT_PUBLIC_APP_URL` con la URL real de Vercel para que los QR apunten al dominio correcto.

---

## 📲 Instalar como PWA (agregar a pantalla de inicio)

### Android (Chrome)
1. Abre la app en Chrome
2. Menú (⋮) → "Agregar a pantalla de inicio"
3. Confirma → la app aparece como ícono en tu celular

### iOS (Safari)
1. Abre la app en Safari
2. Botón compartir (□↑) → "Agregar a pantalla de inicio"
3. Confirma

---

## 🔧 Personalización

### Agregar nuevos tipos de cono
En `src/components/CreateConoForm.tsx`, edita el array `TIPOS`:
```ts
const TIPOS = ["sunscreen", "roller", "duo", "blackout", "screen", "tu-tipo"];
```

### Agregar nuevas medidas
En el mismo archivo, edita `MEDIDAS`:
```ts
const MEDIDAS = ["15m", "20m", "25m", "30m", "40m", "50m", "60m"];
```

---

## 🔮 Próximos pasos (escalabilidad)

- [ ] Autenticación con Supabase Auth
- [ ] Roles: admin / operario
- [ ] Exportar a Excel / PDF
- [ ] Filtros por tipo y color
- [ ] Estadísticas y reportes
- [ ] Notificaciones push (Web Push API)
- [ ] Historial de cambios por cono

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + React |
| Estilos | Tailwind CSS |
| Base de datos | PostgreSQL via Supabase |
| Auth (futuro) | Supabase Auth |
| QR | qrcode (npm) |
| Íconos UI | lucide-react |
| Hosting | Vercel |
| PWA | Web Manifest + Service Worker |
