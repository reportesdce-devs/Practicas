// Utilidades compartidas de las Pages Functions (archivos con _ no crean rutas).

export interface Env {
  BREVO_API_KEY?: string
  SENDER_EMAIL?: string
  SENDER_NAME?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  APP_URL?: string
}

export interface Contexto {
  request: Request
  env: Env
}

export interface PersonaFila {
  id?: string
  nombre: string
  correo: string | null
  rol?: string | null
  carreras?: { nombre: string } | null
}

export interface OpcionesCorreo {
  to: { email: string; name: string }[]
  replyTo?: string
  subject: string
  htmlContent: string
  textContent: string
}

export function json(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function emailValido(correo: unknown): correo is string {
  return typeof correo === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
}

export function baseSupabase(env: Env): { base: string; clave: string } {
  const base = String(env.SUPABASE_URL ?? '').replace(/\/$/, '')
  const clave = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '')
  if (!base || !clave) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  return { base, clave }
}

export function faltantesEnv(env: Env, nombres: (keyof Env)[]): string[] {
  return nombres.filter((nombre) => !env[nombre]).map(String)
}

export async function consultaSupabase(
  base: string,
  clave: string,
  ruta: string,
): Promise<unknown[]> {
  const respuesta = await fetch(`${base}/rest/v1/${ruta}`, {
    headers: { apikey: clave, Authorization: `Bearer ${clave}` },
  })
  if (!respuesta.ok) {
    throw new Error(`Supabase respondió ${respuesta.status} en ${ruta}`)
  }
  return (await respuesta.json()) as unknown[]
}

export async function mutarSupabase(
  base: string,
  clave: string,
  ruta: string,
  metodo: 'POST' | 'PATCH',
  cuerpo: unknown,
): Promise<unknown[]> {
  const respuesta = await fetch(`${base}/rest/v1/${ruta}`, {
    method: metodo,
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(cuerpo),
  })
  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    throw new Error(`Supabase respondió ${respuesta.status} en ${ruta}: ${detalle.slice(0, 300)}`)
  }
  const texto = await respuesta.text()
  return (texto ? JSON.parse(texto) : []) as unknown[]
}

export async function enviarBrevo(env: Env, opciones: OpcionesCorreo): Promise<void> {
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': String(env.BREVO_API_KEY),
    },
    body: JSON.stringify({
      sender: { name: env.SENDER_NAME, email: env.SENDER_EMAIL },
      to: opciones.to,
      ...(opciones.replyTo ? { replyTo: { email: opciones.replyTo } } : {}),
      subject: opciones.subject,
      htmlContent: opciones.htmlContent,
      textContent: opciones.textContent,
    }),
  })
  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    throw new Error(`Brevo respondió ${respuesta.status}: ${detalle.slice(0, 300)}`)
  }
}

export function tokenAleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function usuarioSupabasePorToken(
  base: string,
  claveServicio: string,
  tokenUsuario: string,
): Promise<{ email?: string }> {
  const respuesta = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: claveServicio, Authorization: `Bearer ${tokenUsuario}` },
  })
  if (!respuesta.ok) {
    throw new Error(`Supabase Auth respondió ${respuesta.status}`)
  }
  return (await respuesta.json()) as { email?: string }
}

export function esCoordinador(persona: PersonaFila | undefined): persona is PersonaFila & { correo: string } {
  return Boolean(
    persona?.correo && (persona.rol === 'admin' || persona.rol === 'coordinador'),
  )
}
