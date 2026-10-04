// Cloudflare Pages Function → POST /api/empresa-invitar
// La coordinación confirma la carta y genera el enlace temporal para la empresa.
// Requiere Authorization: Bearer <access_token de Supabase> de un admin/coordinador.

import {
  baseSupabase,
  consultaSupabase,
  emailValido,
  enviarBrevo,
  esCoordinador,
  escapar,
  faltantesEnv,
  json,
  mutarSupabase,
  sha256Hex,
  tokenAleatorio,
  usuarioSupabasePorToken,
  type Contexto,
  type PersonaFila,
} from './_lib'

const DIAS_VIGENCIA = 7

interface Invitacion {
  id: number
  expira_en: string
  usada_en: string | null
  revocada_en: string | null
}

interface Proceso {
  id: number
  folio: string
  periodo: string
  estado: string
  alumno_id: string
}

interface SolicitudCarta {
  id: number
  datos: Record<string, unknown>
}

function correoSupervisorDe(datos: Record<string, unknown>): string | null {
  const correo = datos['correoSupervisor']
  if (!emailValido(correo)) return null
  return correo.trim().toLowerCase()
}

export const onRequestPost = async ({ request, env }: Contexto): Promise<Response> => {
  try {
    const faltantes = faltantesEnv(env, [
      'BREVO_API_KEY',
      'SENDER_EMAIL',
      'SENDER_NAME',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ])
    if (faltantes.length > 0) {
      console.error('empresa-invitar: faltan variables:', faltantes.join(', '))
      return json({ ok: false, error: 'Función sin configurar' }, 500)
    }
    const { base, clave } = baseSupabase(env)

    const autorizacion = request.headers.get('authorization') ?? ''
    const tokenUsuario = autorizacion.toLowerCase().startsWith('bearer ')
      ? autorizacion.slice(7).trim()
      : ''
    if (!tokenUsuario) {
      return json({ ok: false, error: 'Falta autorización' }, 401)
    }

    let cuerpo: { proceso_id?: unknown; reenviar?: unknown }
    try {
      cuerpo = (await request.json()) as { proceso_id?: unknown; reenviar?: unknown }
    } catch {
      return json({ ok: false, error: 'Cuerpo JSON inválido' }, 400)
    }
    if (typeof cuerpo.proceso_id !== 'number' || !Number.isInteger(cuerpo.proceso_id)) {
      return json({ ok: false, error: 'proceso_id inválido' }, 400)
    }
    const procesoId = cuerpo.proceso_id
    const reenviar = cuerpo.reenviar === true

    const usuario = await usuarioSupabasePorToken(base, clave, tokenUsuario)
    if (!usuario.email) {
      return json({ ok: false, error: 'Sesión inválida' }, 401)
    }
    const coordinadores = (await consultaSupabase(
      base,
      clave,
      `personas?correo=eq.${encodeURIComponent(usuario.email)}&select=id,nombre,correo,rol`,
    )) as PersonaFila[]
    const coordinador = coordinadores[0]
    if (!esCoordinador(coordinador)) {
      return json({ ok: false, error: 'Se requiere rol de coordinación' }, 403)
    }

    const procesos = (await consultaSupabase(
      base,
      clave,
      `procesos?id=eq.${procesoId}&select=id,folio,periodo,estado,alumno_id`,
    )) as Proceso[]
    const proceso = procesos[0]
    if (!proceso || proceso.estado !== 'pendiente') {
      return json({ ok: false, error: 'Proceso no disponible para enviar a empresa' }, 409)
    }

    const solicitudes = (await consultaSupabase(
      base,
      clave,
      `solicitudes?proceso_id=eq.${procesoId}&documento=eq.carta_aceptacion&select=id,datos`,
    )) as SolicitudCarta[]
    const carta = solicitudes[0]
    if (!carta) {
      return json({ ok: false, error: 'La carta de aceptación no existe' }, 409)
    }
    const correoEmpresa = correoSupervisorDe(carta.datos)
    if (!correoEmpresa) {
      return json({ ok: false, error: 'La carta no tiene correo del supervisor' }, 422)
    }

    const ahora = new Date()

    const invitaciones = (await consultaSupabase(
      base,
      clave,
      `empresa_invitaciones?proceso_id=eq.${procesoId}&solicitud_id=eq.${carta.id}&usada_en=is.null&revocada_en=is.null&expira_en=gt.${ahora.toISOString()}&select=id,expira_en,usada_en,revocada_en`,
    )) as Invitacion[]
    if (invitaciones.length > 0 && !reenviar) {
      return json({ ok: false, error: 'Ya existe un enlace vigente para la empresa', expira_en: invitaciones[0].expira_en }, 409)
    }
    if (reenviar) {
      for (const invitacion of invitaciones) {
        await mutarSupabase(base, clave, `empresa_invitaciones?id=eq.${invitacion.id}`, 'PATCH', {
          revocada_en: ahora.toISOString(),
        })
      }
    }

    const token = tokenAleatorio()
    const tokenHash = await sha256Hex(token)
    const expira = new Date(ahora.getTime() + DIAS_VIGENCIA * 24 * 60 * 60 * 1000)

    const creadas = (await mutarSupabase(base, clave, 'empresa_invitaciones', 'POST', {
      proceso_id: procesoId,
      solicitud_id: carta.id,
      correo_empresa: correoEmpresa,
      token_sha256: tokenHash,
      expira_en: expira.toISOString(),
    })) as { id: number }[]
    const invitacionId = creadas[0]?.id
    if (!invitacionId) {
      return json({ ok: false, error: 'No se pudo crear la invitación' }, 500)
    }

    const origen = String(env.APP_URL ?? '').replace(/\/$/, '') || new URL(request.url).origin
    const enlace = `${origen}/empresa/completar?token=${token}`
    const expiraTexto = expira.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

    try {
      await enviarBrevo(env, {
        to: [{ email: correoEmpresa, name: 'Empresa receptora' }],
        replyTo: coordinador.correo,
        subject: `Completa los datos de prácticas: folio ${proceso.folio}`,
        htmlContent: `<p>La coordinación de prácticas solicita completar los datos de la empresa para el folio <strong>${proceso.folio}</strong>.</p>
<p><a href="${escapar(enlace)}">Abrir el formulario de la empresa</a></p>
<p>Este enlace temporal vence el <strong>${escapar(expiraTexto)}</strong> y se desactiva al guardar. No lo reenvíes fuera de la empresa.</p>
<p>— ISND · Prácticas Profesionales</p>`,
        textContent: `La coordinación de prácticas solicita completar los datos de la empresa para el folio ${proceso.folio}.

Abre el formulario de la empresa: ${enlace}

Este enlace temporal vence el ${expiraTexto} y se desactiva al guardar. No lo reenvíes fuera de la empresa.

— ISND · Prácticas Profesionales`,
      })
    } catch (error) {
      await mutarSupabase(base, clave, `empresa_invitaciones?id=eq.${invitacionId}`, 'PATCH', {
        revocada_en: new Date().toISOString(),
      }).catch((revocarError) => console.error('empresa-invitar: no se pudo revocar:', revocarError))
      console.error('empresa-invitar:', error)
      return json({ ok: false, error: 'No se pudo enviar el correo a la empresa' }, 502)
    }

    await mutarSupabase(base, clave, `procesos?id=eq.${procesoId}`, 'PATCH', {
      empresa_correo: correoEmpresa,
      empresa_estado: 'enviada',
      empresa_expira_en: expira.toISOString(),
    })

    return json({ ok: true, expira_en: expira.toISOString() })
  } catch (error) {
    console.error('empresa-invitar:', error)
    return json({ ok: false, error: 'No se pudo generar el enlace' }, 500)
  }
}
