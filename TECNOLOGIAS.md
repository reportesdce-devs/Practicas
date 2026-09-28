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
| TanStack Query | 5 | Consultas a la API |
| Supabase JS | 2 | Autenticación Google + base de datos |
| react-hook-form + zod + @hookform/resolvers | 7 / 4 / 5 | Formularios con validación (el resolvers es el puente RHF ↔ zod) |
| Vitest | 5 | Tests unitarios de la lógica de `src/lib` |
| Cloudflare Pages Functions + Brevo | — | Envío de correos con el folio (alumno + coordinadores), ver README |
| jsPDF + qrcode | 4 / 1 | Generar cartas en PDF con código QR (**pendiente de usar**) |
| oxlint | 1 | Revisión / lint del código |

---

## 2. Comandos de instalación

```bash
# Proyecto base (React + TypeScript)
npm create vite@latest practicas-scaffold -- --template react-ts

# Dependencias del proyecto
npm install react-router-dom @supabase/supabase-js @tanstack/react-query \
  react-hook-form zod @hookform/resolvers jspdf qrcode

# Tailwind CSS v4
npm install -D tailwindcss @tailwindcss/vite @types/qrcode

# Tests
npm install -D vitest
```

> `@react-oauth/google` se instaló en su día y se **eliminó** en la auditoría:
> el login usa `supabase.auth.signInWithOAuth`.

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
│   ├── components/
│   │   ├── ErrorBoundary.tsx     # Captura errores de render (sin pantalla blanca)
│   │   ├── LoadingScreen.tsx
│   │   ├── RequireAuth.tsx       # Exige sesión activa
│   │   ├── RequireRole.tsx       # Exige rol (alumno / coordinador)
│   │   ├── RoleRedirect.tsx      # Redirige según rol
│   │   └── form/                 # Campos compartidos de formularios
│   │       ├── FormField.tsx     # Label + error
│   │       └── inputs.tsx        # TextInput, TextArea, Select
│   ├── context/
│   │   ├── AuthContext.tsx       # Tipos y hook useAuth()
│   │   └── AuthProvider.tsx      # Sesión de Supabase + perfil
│   ├── layouts/
│   │   └── AppLayout.tsx         # Header (usuario + salir) y footer
│   ├── lib/
│   │   ├── supabase.ts           # Cliente de Supabase
│   │   ├── types.ts              # Tipos Persona, roles
│   │   ├── documentos.ts         # Catálogo de los 3 documentos
│   │   ├── procesos.ts           # Procesos: periodo, búsquedas, crear, estados
│   │   ├── solicitudes.ts        # Consultar/crear documentos en un proceso
│   │   ├── notificaciones.ts     # Aviso de folio nuevo a la Pages Function
│   │   ├── schemas/
│   │   │   └── documento.ts      # Validación zod de los 3 formularios
│   │   └── __tests__/            # Tests unitarios (Vitest)
│   │       ├── mockSupabase.ts   # Doble del cliente Supabase
│   │       ├── periodo.test.ts
│   │       ├── buscarProceso.test.ts
│   │       ├── crearProceso.test.ts
│   │       └── notificaciones.test.ts
│   ├── pages/
│   │   ├── LoginPage.tsx                # Login con Google
│   │   ├── alumno/
│   │   │   ├── DocumentosPage.tsx       # Estado de los 3 documentos + folio
│   │   │   └── FormularioDocumentoPage.tsx  # Comparte carta/avance/cierre
│   │   └── coordinador/
│   │       └── SolicitudesPage.tsx      # Lista, detalle y aceptar/rechazar
│   ├── App.tsx            # Rutas + ErrorBoundary
│   └── main.tsx           # Proveedores globales (Query, Auth, Router)
├── supabase/
│   └── migrations/        # Migraciones SQL versionadas
├── functions/
│   └── api/
│       └── enviar-folio.ts  # Pages Function: envía correos vía Brevo (ver README)
├── public/
│   └── _headers            # Cabeceras de seguridad (Cloudflare Pages)
├── legacy/                # Demo anterior (HTML plano con jsPDF)
├── .env                   # Variables secretas (no se sube a git)
├── .env.example           # Plantilla de las variables
├── README.md              # Guía del proyecto (setup, migraciones, deploy)
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
| `npm run build` | Compilar para producción (`tsc -b && vite build`) |
| `npm run lint` | Revisar el código |
| `npm test` | Tests unitarios (una corrida) |
| `npm run test:watch` | Tests en modo watch |
| `npm run preview` | Sirve el build compilado |

---

## 7. Configuración en Supabase (referencia)

Todo esto ya está hecho; queda documentado para replicarlo en otro entorno:

1. **SQL Editor**: aplicar los archivos de `supabase/migrations/` **en el orden del
   README** (los nombres comparten fecha `20260927_`, el orden alfabético no sirve).
   Las migraciones se ejecutan *statement por statement* y hay que revisar la
   consola para confirmar que ningún statement falló.
2. **Authentication → Providers → Google**: proveedor activo con Client ID y
   Secret de Google Cloud Console.
3. **Authentication → URL Configuration**: Site URL = `http://localhost:5173`
   (producción: la URL de despliegue en Cloudflare Pages).
4. **Google Cloud Console → Credenciales**: *URI de redireccionamiento autorizado*
   `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
5. **personas**: registro de usuarios con su `tipo`/`rol`; RLS activo con la
   política `personas_select_propia_o_coordinador` (lectura propia o total si es
   coordinador/admin). No existe política de UPDATE: el rol no se puede
   autoasignar desde la app.

**Verificación rápida de seguridad** (con la anon key, sin sesión): cualquier
`select` debe devolver `[]` y cualquier `insert/update` debe fallar.
