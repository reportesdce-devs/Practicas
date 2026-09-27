# Tecnologías e instalaciones

Resumen simple de todo lo instalado y configurado en el proyecto.

---

## 1. Stack principal

| Tecnología | Versión | Para qué sirve |
|---|---|---|
| React | 19 | Interfaz de usuario |
| Vite | 8 | Servidor de desarrollo y compilación |
| TypeScript | 6 | Tipado estricto del código |
| Tailwind CSS | 4 | Estilos (clases utilitarias) |
| React Router | 7 | Rutas: `/login`, `/alumno`, `/coordinador` |
| TanStack Query | 5 | Consultas a la API (listo para usar) |
| Supabase JS | 2 | Autenticación Google + base de datos |
| react-hook-form + zod | 7 / 4 | Formularios con validación |
| jsPDF + qrcode | 4 / 1 | Generar cartas en PDF con código QR |
| oxlint | 1 | Revisión / lint del código |

---

## 2. Comandos de instalación ejecutados

```bash
# Proyecto base (React + TypeScript)
npm create vite@latest practicas-scaffold -- --template react-ts

# Dependencias del proyecto
npm install react-router-dom @supabase/supabase-js @react-oauth/google \
  @tanstack/react-query react-hook-form zod jspdf qrcode

# Tailwind CSS v4
npm install -D tailwindcss @tailwindcss/vite @types/qrcode
```

---

## 3. Variables de entorno (`.env`)

Creado a partir de `.env.example`. **No se sube a git** (está en `.gitignore`).

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto en Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon / publishable key) |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google OAuth |

---

## 4. Estructura del proyecto

```
Practicas/
├── src/
│   ├── components/      # Guards de rutas y pantalla de carga
│   │   ├── LoadingScreen.tsx
│   │   ├── RequireAuth.tsx      # Exige sesión activa
│   │   ├── RequireRole.tsx      # Exige rol (alumno / coordinador)
│   │   └── RoleRedirect.tsx     # Redirige según rol
│   ├── context/
│   │   ├── AuthContext.tsx      # Tipos y hook useAuth()
│   │   └── AuthProvider.tsx     # Sesión de Supabase + perfil
│   ├── layouts/
│   │   └── AppLayout.tsx        # Header (usuario + salir) y footer
│   ├── lib/
│   │   ├── supabase.ts          # Cliente de Supabase
│   │   └── types.ts             # Tipos Persona, roles
│   ├── pages/
│   │   ├── LoginPage.tsx                # Login con Google
│   │   ├── alumno/
│   │   │   ├── DocumentosPage.tsx       # Consulta de documentos
│   │   │   └── CartaAceptacionPage.tsx  # Formulario (pendiente)
│   │   └── coordinador/
│   │       └── SolicitudesPage.tsx      # Panel de solicitudes (pendiente)
│   ├── App.tsx            # Definición de rutas
│   └── main.tsx           # Proveedores globales (Query, Auth, Router)
├── legacy/                # Demo anterior (HTML plano con jsPDF)
├── .env                   # Variables secretas (no se sube a git)
├── .env.example           # Plantilla de las variables
└── TECNOLOGIAS.md         # Este archivo
```

---

## 5. Flujo de autenticación implementado

1. El usuario entra a `/login` y pulsa **Continuar con Google**.
2. Supabase redirige a Google y regresa con la sesión activa.
3. Se busca el correo en la tabla `personas` (base de datos Supabase).
4. Según el registro se redirige:
   - `tipo = Alumno` → `/alumno/documentos`
   - `rol = admin o coordinador` → `/coordinador`
5. Si el correo **no existe** en `personas`, se muestra mensaje de sin acceso.

---

## 6. Comandos disponibles

| Comando | Función |
|---|---|
| `npm run dev` | Arrancar en desarrollo → http://localhost:5173 |
| `npm run build` | Compilar para producción |
| `npm run lint` | Revisar el código |
| `npm run preview` | Ver el build compilado |

---

## 7. Configuración pendiente en Supabase (panel web)

Estos pasos se hacen una sola vez desde el dashboard:

1. **Authentication → Providers → Google**: activar el proveedor y pegar el
   Client ID y Client Secret de Google Cloud Console.
2. **Authentication → URL Configuration**: colocar como Site URL
   `http://localhost:5173` (producción: la URL de despliegue).
3. **Google Cloud Console → Credenciales**: agregar como *URI de redireccionamiento
   autorizado* `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
4. Si la tabla `personas` tiene RLS activo, crear una política `SELECT` para que
   cada usuario pueda leer su propio registro (comparando `correo` con su JWT).
