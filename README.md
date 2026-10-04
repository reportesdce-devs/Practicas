# Prácticas Profesionales · ISND

Sistema de solicitudes de documentos de prácticas profesionales para
**Sistemas y Negocios Digitales (ISND)**. Los alumnos solicitan sus 3
documentos (carta de aceptación, avance y cierre) y la coordinación los
revisa y aprueba desde un panel.

> Producción: https://practicas-dce.pages.dev/

---

## Funcionalidades

- **Login solo con Google** restringido al dominio institucional (`@iest.edu.mx`).
- **Roles**: alumno (solicita documentos) y coordinador/admin (aprueba o rechaza).
- **Modelo de proceso**: cada alumno tiene un *proceso* por periodo (ene–jul = `YYYY-1`,
  ago–dic = `YYYY-2`) que agrupa sus 3 documentos bajo un folio `XXXX-XXXX-XXXX`.
- **Flujo**: primero la carta de aceptación → luego avance y cierre → la
  coordinación acepta solo con los 3 documentos (1/3, 2/3 → solo rechazo).
- **Carta con empresa**: el alumno registra empresa/lugar, supervisor (nombre,
  puesto y correo) y actividades; la coordinación confirma y envía un enlace
  temporal a la empresa, que completa giro, tamaño, fechas, horarios y
  directivo. Avance/cierre se desbloquean con la carta completa.
- **Panel del coordinador**: lista de procesos, búsqueda por nombre/correo/folio,
  detalle por documento y estados pendiente/aceptada/rechazada.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router 7 · TanStack Query 5 ·
Supabase (auth + Postgres + RLS) · react-hook-form + zod · oxlint.
Detalle completo en [`TECNOLOGIAS.md`](TECNOLOGIAS.md).

---

## Requisitos

- Node.js 24+ y npm 11+
- Proyecto en [Supabase](https://supabase.com) (base de datos + auth)
- Client ID de Google Cloud Console (OAuth)

## Puesta en marcha

```bash
git clone https://github.com/reportesdce-devs/Practicas.git
cd Practicas
npm install
cp .env.example .env      # y completa las 3 variables
npm run dev               # → http://localhost:5173
```

Variables de entorno (`.env`, nunca se sube a git):

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon) — va embebida en el frontend |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google OAuth |

---

## Base de datos

Las migraciones viven en `supabase/migrations/` y se aplican en el **SQL Editor
de Supabase**, una por una y **en este orden** (los nombres comparten fecha, así
que el orden alfabético NO sirve):

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `20260927_create_solicitudes.sql` | Tabla `solicitudes` + RLS (insert/select/update propios) |
| 2 | `20260927_carreras_select_authenticated.sql` | Permite leer `carreras` a usuarios con sesión |
| 3 | `20260927_personas_rls_hardening.sql` | Cierra lectura anónima de `personas`; helper `es_admin_o_coordinador()` |
| 4 | `20260927_create_procesos.sql` | Tabla `procesos`, liga `solicitudes.proceso_id`, backfill, RLS |
| 5 | `20260927_rls_insert_hardening.sql` | Endurece INSERT (periodo/estado/folio/documento/tamaño) |
| 6 | `20260930_empresa_flujo.sql` | Invitaciones de empresa, estado empresa en `procesos`, backfill de cartas completas y RLS (avance/cierre solo con carta completa) |

**Reglas del SQL Editor de Supabase**: ejecuta *statement por statement* en
conexiones separadas y **continúa aunque un statement falle**. Por eso las
migraciones de este proyecto no usan tablas temporales ni bloques `DO`, cada
statement es autocontenido e idempotente (`if not exists` / `drop if exists`),
y hay que leer la consola tras ejecutar para confirmar que no hubo errores.

### Modelo de seguridad (RLS)

- RLS activo en todas las tablas; la **anon key es pública** y por eso nada se
  lee sin sesión.
- Cada quien ve **su propia fila** en `personas` (comparando el `correo` del JWT);
  coordinadores/admin ven todas.
- El rol vive en `personas.rol` en la base de datos — los permisos reales los
  aplican las políticas RLS, no el frontend.
- Un alumno solo puede: insertar filas propias con su correo JWT, en su proceso
  del periodo actual, con documento válido y `datos` ≤ 50 KB.
- Para verificar tras aplicar migraciones: con la anon key, cualquier `select`
  debe devolver `[]` y cualquier `insert/update` debe fallar.

---

## Autenticación con Google (una sola vez)

1. **Google Cloud Console → Credenciales**: crear OAuth Client ID (tipo *Web*),
   agregar el dominio y como *URI de redireccionamiento autorizado*
   `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
2. **Supabase → Authentication → Providers → Google**: activar y pegar
   Client ID y Secret.
3. **Supabase → Authentication → URL Configuration**: Site URL = la URL del deploy.
4. Registrar al usuario en la tabla `personas` (con `tipo`/`rol` correspondiente);
   sin esa fila el login muestra "correo no registrado".

---

## Notificaciones por correo (folios)

Cuando el alumno envía su **carta de aceptación** (abre un proceso), la app avisa
por correo al alumno (con su folio) y a todos los coordinadores. Cada folio nuevo
(rechazo → nueva solicitud) reenvía el aviso.

El envío ocurre en una **Cloudflare Pages Function** (`functions/api/enviar-folio.ts`)
con **Brevo** como servicio de correo; los secretos viven solo en Cloudflare, nunca
en el repo ni en el navegador.

### Configuración (una sola vez)

1. **[Brevo](https://app.brevo.com)** → cuenta gratis → *Transactional → Senders →
   Add sender* → verifica tu correo con el código que te llega →
   *SMTP & API → API keys → Generate* (copia la clave; solo se muestra una vez).
2. **Cloudflare Pages → proyecto → Settings → Environment variables** → agregar
   (en *Production* y *Preview*; las sensibles con *Encrypt*):

   | Variable | Valor |
   |---|---|
   | `BREVO_API_KEY` | clave de Brevo |
   | `SENDER_EMAIL` | correo verificado como sender en Brevo |
   | `SENDER_NAME` | ej. `Prácticas ISND` |
   | `SUPABASE_URL` | URL del proyecto Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (`service_role`) |
   | `APP_URL` | ej. `https://practicas-dce.pages.dev` (opcional) |

3. Push a `main`: Cloudflare despliega la function automáticamente.
4. Prueba: envía una carta de aceptación (o rechaza y vuelve a solicitar) y revisa
   la bandeja. Si algo falla, el detalle queda en *Cloudflare → Functions → Logs*.

> ⚠️ La `service_role` key tiene permiso total sobre la base de datos: nunca la
> subas al repo, al frontend ni la compartas. Si se filtra, regenerala desde el
> panel de Supabase.

Notas: en `npm run dev` no existe `/api/...` (404 que se ignora sin romper nada);
la function solo acepta procesos creados en los últimos 10 minutos (evita
reenvíos). Brevo puede tardar en aprobar cuentas nuevas: si ves error 401/403 en
los logs, revisa el estado de tu cuenta en su panel.

---

## Comandos

| Comando | Función |
|---|---|
| `npm run dev` | Servidor de desarrollo (HMR) |
| `npm run build` | Compila producción (`tsc -b && vite build`) |
| `npm run lint` | Revisión con oxlint |
| `npm run preview` | Sirve el build compilado |

## Estructura

```
src/
├── components/        # guards (RequireAuth/Role), LoadingScreen, ErrorBoundary, form/
├── context/           # AuthContext + AuthProvider (sesión y perfil)
├── layouts/           # AppLayout (header/footer)
├── lib/               # supabase client, types, procesos, solicitudes, documentos, schemas/
├── pages/             # LoginPage, alumno/, coordinador/, empresa/ (enlace temporal público)
├── App.tsx            # rutas + ErrorBoundary
└── main.tsx           # proveedores (Query, Auth, Router)
supabase/migrations/   # migraciones SQL versionadas
functions/api/         # enviar-folio, empresa-invitar, empresa (enlace temporal)
legacy/                # demo anterior (HTML plano con jsPDF)
```

## Despliegue

Cloudflare Pages apunta a la rama `main` (build: `npm run build`, salida: `dist/`).
El archivo `public/_headers` agrega cabeceras de seguridad (CSP, X-Frame-Options,
nosniff, etc.) — tras el primer deploy, abre la consola del navegador una vez para
confirmar que la CSP no reporta bloqueos.
