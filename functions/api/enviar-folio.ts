// Cloudflare Pages Function → POST /api/enviar-folio
// Se despliega sola al hacer push (carpeta functions/ en la raíz del repo).
//
// Flujo: la app avisa recién creado un proceso (carta de aceptación) mandando
// { folio }. Esta función valida el folio, verifica que el proceso sea reciente
// (ventana de 10 min, evita reenvíos), busca al alumno y a todos los
// coordinadores en Supabase con la service key y envía los correos vía Brevo.
//
// Secretos (Cloudflare Pages → Settings → Environment variables):
//   BREVO_API_KEY, SENDER_EMAIL, SENDER_NAME,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (¡solo en Cloudflare, jamás en el repo!)
//   APP_URL (opcional, enlace al panel en los correos)

interface Env {
  BREVO_API_KEY?: string
  SENDER_EMAIL?: string
  SENDER_NAME?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  APP_URL?: string
}

interface Contexto {
  request: Request
  env: Env
}

interface PersonaFila {
  id?: string
  nombre: string
  correo: string | null
  carreras?: { nombre: string } | null
}

interface OpcionesCorreo {
  to: { email: string; name: string }[]
  replyTo?: string
  subject: string
  htmlContent: string
  textContent: string
}

const FOLIO_REGEX = /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/
const VENTANA_MINUTOS = 10

function json(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function consultaSupabase(
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

async function enviarBrevo(env: Env, opciones: OpcionesCorreo): Promise<void> {
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

function correoAlumno(datos: {
  nombre: string
  folio: string
  periodo: string
  coordinadores: string[]
}): Pick<OpcionesCorreo, 'subject' | 'htmlContent' | 'textContent'> {
  const encabezado = `<p>Hola ${escapar(datos.nombre)},</p>
<p>Se abrió tu <strong>proceso de prácticas</strong> del periodo <strong>${escapar(datos.periodo)}</strong>.</p>
<p style="font-size:24px;font-weight:bold;color:#f05a28;text-align:center;letter-spacing:3px;border:2px solid #f05a28;border-radius:8px;padding:16px;margin:16px 0;">${datos.folio}</p>
<p>Guarda este código: la coordinación lo usará para identificar tu proceso. Ya tienes <strong>1 de 3 documentos</strong> (carta de aceptación); después faltan avance y cierre.</p>
${datos.coordinadores.length > 0 ? `<p>Dudas con la coordinación: ${datos.coordinadores.map(escapar).join(', ')}</p>` : ''}
<p>— ISND · Prácticas Profesionales</p>`

  const texto = `Hola ${datos.nombre},

Se abrió tu proceso de prácticas del periodo ${datos.periodo}.

FOLIO: ${datos.folio}

Guarda este código: la coordinación lo usará para identificar tu proceso.
Ya tienes 1 de 3 documentos (carta de aceptación); después faltan avance y cierre.${
    datos.coordinadores.length > 0 ? `\n\nDudas con la coordinación: ${datos.coordinadores.join(', ')}` : ''
  }

— ISND · Prácticas Profesionales`

  return {
    subject: `Tu folio de prácticas: ${datos.folio}`,
    htmlContent: encabezado,
    textContent: texto,
  }
}

export const onRequestPost = async ({ request, env }: Contexto): Promise<Response> => {
  try {
    const faltantes = (
      ['BREVO_API_KEY', 'SENDER_EMAIL', 'SENDER_NAME', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const
    ).filter((nombre) => !env[nombre])
    if (faltantes.length > 0) {
      console.error('enviar-folio: faltan variables de entorno:', faltantes.join(', '))
      return json({ ok: false, error: 'Función sin configurar: faltan variables en Cloudflare' }, 500)
    }

    let cuerpo: { folio?: unknown }
    try {
      cuerpo = (await request.json()) as { folio?: unknown }
    } catch {
      return json({ ok: false, error: 'Cuerpo JSON inválido' }, 400)
    }
    if (typeof cuerpo.folio !== 'string' || !FOLIO_REGEX.test(cuerpo.folio)) {
      return json({ ok: false, error: 'Folio inválido' }, 400)
    }
    const folio = cuerpo.folio

    const base = String(env.SUPABASE_URL).replace(/\/$/, '')
    const clave = String(env.SUPABASE_SERVICE_ROLE_KEY)

    const procesos = (await consultaSupabase(
      base,
      clave,
      `procesos?folio=eq.${folio}&select=id,folio,alumno_id,periodo,creado_en`,
    )) as { alumno_id: string; periodo: string; creado_en: string }[]
    const proceso = procesos[0]
    if (!proceso) {
      return json({ ok: false, error: 'Folio no encontrado' }, 404)
    }

    const antiguedad = Date.now() - Date.parse(proceso.creado_en)
    if (!Number.isFinite(antiguedad) || antiguedad > VENTANA_MINUTOS * 60_000) {
      return json(
        { ok: false, error: 'El aviso solo aplica a procesos recién creados' },
        409,
      )
    }

    const alumnos = (await consultaSupabase(
      base,
      clave,
      `personas?id=eq.${encodeURIComponent(proceso.alumno_id)}&select=id,nombre,correo,carreras(nombre)`,
    )) as PersonaFila[]
    const alumno = alumnos[0]
    if (!alumno?.correo) {
      return json({ ok: false, error: 'El alumno no tiene correo registrado' }, 422)
    }

    const coordinadores = (
      (await consultaSupabase(
        base,
        clave,
        'personas?rol=in.(admin,coordinador)&select=nombre,correo',
      )) as PersonaFila[]
    ).filter((persona): persona is PersonaFila & { correo: string } => Boolean(persona.correo))

    await enviarBrevo(env, {
      ...correoAlumno({
        nombre: alumno.nombre,
        folio,
        periodo: proceso.periodo,
        coordinadores: coordinadores.map((persona) => persona.correo),
      }),
      to: [{ email: alumno.correo, name: alumno.nombre }],
    })

    if (coordinadores.length > 0) {
      const carrera = alumno.carreras?.nombre ?? '—'
      const enlace = env.APP_URL ? `\n\nRevisa el panel: ${env.APP_URL}` : ''
      await enviarBrevo(env, {
        to: coordinadores.map((persona) => ({ email: persona.correo, name: persona.nombre })),
        replyTo: alumno.correo,
        subject: `Nuevo proceso de prácticas: ${alumno.nombre} (${folio})`,
        htmlContent: `<p>Se abrió un <strong>nuevo proceso de prácticas</strong>.</p>
<table cellpadding="6" style="border-collapse:collapse">
<tr><td><strong>Alumno</strong></td><td>${escapar(alumno.nombre)}</td></tr>
<tr><td><strong>Carrera</strong></td><td>${escapar(carrera)}</td></tr>
<tr><td><strong>Periodo</strong></td><td>${escapar(proceso.periodo)}</td></tr>
<tr><td><strong>Folio</strong></td><td style="color:#f05a28;font-weight:bold">${folio}</td></tr>
<tr><td><strong>Documentos</strong></td><td>1 de 3 (carta de aceptación enviada)</td></tr>
</table>
<p>Responder a este correo notifica al alumno.${env.APP_URL ? ` Revisa el panel: <a href="${escapar(env.APP_URL)}">${escapar(env.APP_URL)}</a>` : ''}</p>
<p>— ISND · Prácticas Profesionales</p>`,
        textContent: `Se abrió un nuevo proceso de prácticas.

Alumno: ${alumno.nombre}
Carrera: ${carrera}
Periodo: ${proceso.periodo}
Folio: ${folio}
Documentos: 1 de 3 (carta de aceptación enviada)

Responder a este correo notifica al alumno.${enlace}

— ISND · Prácticas Profesionales`,
      })
    }

    return json({ ok: true, enviados: 1 + coordinadores.length })
  } catch (error) {
    console.error('enviar-folio:', error)
    return json({ ok: false, error: 'No se pudo enviar el aviso' }, 500)
  }
}
