// Cloudflare Pages Function → GET/POST /api/empresa
// Formulario público temporal para que la empresa complete la carta.
// El token bearer se valida contra empresa_invitaciones con service_role.

import {
  baseSupabase,
  consultaSupabase,
  enviarBrevo,
  escapar,
  faltantesEnv,
  json,
  mutarSupabase,
  sha256Hex,
  type Contexto,
  type PersonaFila,
} from './_lib'

interface Invitacion {
  id: number
  proceso_id: number
  solicitud_id: number
  correo_empresa: string
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

interface Solicitud {
  id: number
  datos: Record<string, unknown>
}

interface Complemento {
  giro: string
  tipoOrganizacion: 'Privada' | 'Pública'
  tamano: 'Pequeña' | 'Mediana' | 'Grande'
  fechaInicio: string
  horarioInicio: string
  horarioFin: string
  dias: string
  directivo: string
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor)
}

function texto(valor: unknown, minimo: number): string | null {
  if (typeof valor !== 'string') return null
  const limpio = valor.trim()
  return limpio.length >= minimo ? limpio : null
}

function validarComplemento(datos: unknown): { ok: true; valor: Complemento } | { ok: false; error: string } {
  if (!esObjeto(datos)) return { ok: false, error: 'Datos inválidos' }
  const giro = texto(datos['giro'], 3)
  const tipo = datos['tipoOrganizacion']
  const tamano = datos['tamano']
  const fecha = datos['fechaInicio']
  const inicio = datos['horarioInicio']
  const fin = datos['horarioFin']
  const dias = texto(datos['dias'], 3)
  const directivo = texto(datos['directivo'], 3)
  if (!giro) return { ok: false, error: 'Escribe el giro de la empresa' }
  if (tipo !== 'Privada' && tipo !== 'Pública') return { ok: false, error: 'Selecciona el tipo de organización' }
  if (tamano !== 'Pequeña' && tamano !== 'Mediana' && tamano !== 'Grande') {
    return { ok: false, error: 'Selecciona el tamaño de la empresa' }
  }
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, error: 'Selecciona la fecha de inicio' }
  }
  if (typeof inicio !== 'string' || !/^\d{2}:\d{2}$/.test(inicio)) {
    return { ok: false, error: 'Formato de entrada 09:00' }
  }
  if (typeof fin !== 'string' || !/^\d{2}:\d{2}$/.test(fin)) {
    return { ok: false, error: 'Formato de salida 14:00' }
  }
  if (fin <= inicio) {
    return { ok: false, error: 'El horario de salida debe ser posterior a la entrada' }
  }
  if (!dias) return { ok: false, error: 'Indica los días de trabajo' }
  if (!directivo) return { ok: false, error: 'Nombre del directivo que autoriza' }
  return {
    ok: true,
    valor: {
      giro,
      tipoOrganizacion: tipo,
      tamano,
      fechaInicio: fecha,
      horarioInicio: inicio,
      horarioFin: fin,
      dias,
      directivo,
    },
  }
}

function actividadesComoTexto(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return valor
    .map((item) => {
      if (typeof item === 'string') return item
      if (esObjeto(item) && typeof item['valor'] === 'string') return item['valor'] as string
      return ''
    })
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

async function cargarPorToken(
  base: string,
  clave: string,
  token: string,
): Promise<{ invitacion: Invitacion; proceso: Proceso; solicitud: Solicitud } | null> {
  if (!token || token.length < 20) return null
  const hash = await sha256Hex(token)
  const invitaciones = (await consultaSupabase(
    base,
    clave,
    `empresa_invitaciones?token_sha256=eq.${hash}&select=id,proceso_id,solicitud_id,correo_empresa,expira_en,usada_en,revocada_en`,
  )) as Invitacion[]
  const invitacion = invitaciones[0]
  if (!invitacion || invitacion.usada_en || invitacion.revocada_en) return null
  if (!Number.isFinite(Date.parse(invitacion.expira_en)) || Date.parse(invitacion.expira_en) <= Date.now()) {
    return null
  }

  const procesos = (await consultaSupabase(
    base,
    clave,
    `procesos?id=eq.${invitacion.proceso_id}&select=id,folio,periodo,estado,alumno_id`,
  )) as Proceso[]
  const proceso = procesos[0]
  if (!proceso || proceso.estado !== 'pendiente') return null

  const solicitudes = (await consultaSupabase(
    base,
    clave,
    `solicitudes?id=eq.${invitacion.solicitud_id}&proceso_id=eq.${invitacion.proceso_id}&select=id,datos`,
  )) as Solicitud[]
  const solicitud = solicitudes[0]
  if (!solicitud || !esObjeto(solicitud.datos)) return null

  return { invitacion, proceso, solicitud }
}

export const onRequestGet = async ({ request, env }: Contexto): Promise<Response> => {
  try {
    const faltantes = faltantesEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    if (faltantes.length > 0) return json({ ok: false, error: 'Función sin configurar' }, 500)
    const { base, clave } = baseSupabase(env)
    const token = new URL(request.url).searchParams.get('token') ?? ''
    const contexto = await cargarPorToken(base, clave, token)
    if (!contexto) {
      return json({ ok: false, error: 'Enlace inválido o vencido' }, 404)
    }
    const datos = contexto.solicitud.datos
    return json({
      ok: true,
      folio: contexto.proceso.folio,
      periodo: contexto.proceso.periodo,
      expira_en: contexto.invitacion.expira_en,
      alumno: {
        empresa: typeof datos['empresa'] === 'string' ? datos['empresa'] : '',
        lugar: typeof datos['lugar'] === 'string' ? datos['lugar'] : '',
        supervisor: typeof datos['supervisor'] === 'string' ? datos['supervisor'] : '',
        puestoSupervisor: typeof datos['puestoSupervisor'] === 'string' ? datos['puestoSupervisor'] : '',
        actividades: actividadesComoTexto(datos['actividades']),
      },
      empresa: {
        giro: typeof datos['giro'] === 'string' ? datos['giro'] : '',
        tipoOrganizacion: datos['tipoOrganizacion'] ?? 'Privada',
        tamano: datos['tamano'] ?? 'Mediana',
        fechaInicio: typeof datos['fechaInicio'] === 'string' ? datos['fechaInicio'] : '',
        horarioInicio: typeof datos['horarioInicio'] === 'string' ? datos['horarioInicio'] : '',
        horarioFin: typeof datos['horarioFin'] === 'string' ? datos['horarioFin'] : '',
        dias: typeof datos['dias'] === 'string' ? datos['dias'] : '',
        directivo: typeof datos['directivo'] === 'string' ? datos['directivo'] : '',
      },
    })
  } catch (error) {
    console.error('empresa GET:', error)
    return json({ ok: false, error: 'No se pudo validar el enlace' }, 500)
  }
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
    if (faltantes.length > 0) return json({ ok: false, error: 'Función sin configurar' }, 500)
    const { base, clave } = baseSupabase(env)

    let cuerpo: { token?: unknown; datos?: unknown }
    try {
      cuerpo = (await request.json()) as { token?: unknown; datos?: unknown }
    } catch {
      return json({ ok: false, error: 'Cuerpo JSON inválido' }, 400)
    }
    if (typeof cuerpo.token !== 'string') {
      return json({ ok: false, error: 'Enlace inválido o vencido' }, 404)
    }
    const validacion = validarComplemento(cuerpo.datos)
    if (!validacion.ok) {
      return json({ ok: false, error: validacion.error }, 400)
    }

    const contexto = await cargarPorToken(base, clave, cuerpo.token)
    if (!contexto) {
      return json({ ok: false, error: 'Enlace inválido o vencido' }, 404)
    }

    const actual = contexto.solicitud.datos
    const ahora = new Date().toISOString()
    const mezclados: Record<string, unknown> = {
      ...actual,
      giro: validacion.valor.giro,
      tipoOrganizacion: validacion.valor.tipoOrganizacion,
      tamano: validacion.valor.tamano,
      fechaInicio: validacion.valor.fechaInicio,
      horarioInicio: validacion.valor.horarioInicio,
      horarioFin: validacion.valor.horarioFin,
      dias: validacion.valor.dias,
      directivo: validacion.valor.directivo,
      origen: 'alumno',
      completada_empresa: true,
      completada_empresa_en: ahora,
    }

    await mutarSupabase(base, clave, `solicitudes?id=eq.${contexto.solicitud.id}`, 'PATCH', {
      datos: mezclados,
    })
    await mutarSupabase(base, clave, `empresa_invitaciones?id=eq.${contexto.invitacion.id}`, 'PATCH', {
      usada_en: ahora,
    })
    await mutarSupabase(base, clave, `procesos?id=eq.${contexto.proceso.id}`, 'PATCH', {
      empresa_estado: 'completada',
      empresa_completada_en: ahora,
    })

    const alumnos = (await consultaSupabase(
      base,
      clave,
      `personas?id=eq.${encodeURIComponent(contexto.proceso.alumno_id)}&select=id,nombre,correo,carreras(nombre)`,
    )) as PersonaFila[]
    const alumno = alumnos[0]
    const coordinadores = (
      (await consultaSupabase(
        base,
        clave,
        'personas?rol=in.(admin,coordinador)&select=nombre,correo',
      )) as PersonaFila[]
    ).filter((persona): persona is PersonaFila & { correo: string } => Boolean(persona.correo))

    if (alumno?.correo) {
      await enviarBrevo(env, {
        to: [{ email: alumno.correo, name: alumno.nombre }],
        subject: `Tu carta está completa: ${contexto.proceso.folio}`,
        htmlContent: `<p>Hola ${escapar(alumno.nombre)},</p><p>La empresa completó tu <strong>carta de aceptación</strong> del folio <strong>${contexto.proceso.folio}</strong>. Ya puedes solicitar avance y cierre.</p><p>— ISND · Prácticas Profesionales</p>`,
        textContent: `Hola ${alumno.nombre},\n\nLa empresa completó tu carta de aceptación del folio ${contexto.proceso.folio}. Ya puedes solicitar avance y cierre.\n\n— ISND · Prácticas Profesionales`,
      }).catch((error) => console.error('empresa POST aviso alumno:', error))
    }

    if (coordinadores.length > 0) {
      await enviarBrevo(env, {
        to: coordinadores.map((persona) => ({ email: persona.correo, name: persona.nombre })),
        subject: `Carta completada por empresa: ${contexto.proceso.folio}`,
        htmlContent: `<p>La empresa completó la <strong>carta de aceptación</strong>.</p><table cellpadding="6" style="border-collapse:collapse"><tr><td><strong>Alumno</strong></td><td>${escapar(alumno?.nombre ?? '—')}</td></tr><tr><td><strong>Folio</strong></td><td style="color:#f05a28;font-weight:bold">${contexto.proceso.folio}</td></tr><tr><td><strong>Periodo</strong></td><td>${escapar(contexto.proceso.periodo)}</td></tr></table><p>— ISND · Prácticas Profesionales</p>`,
        textContent: `La empresa completó la carta de aceptación.\n\nAlumno: ${alumno?.nombre ?? '—'}\nFolio: ${contexto.proceso.folio}\nPeriodo: ${contexto.proceso.periodo}\n\n— ISND · Prácticas Profesionales`,
      }).catch((error) => console.error('empresa POST aviso coordinación:', error))
    }

    return json({ ok: true, folio: contexto.proceso.folio })
  } catch (error) {
    console.error('empresa POST:', error)
    return json({ ok: false, error: 'No se pudo guardar la información' }, 500)
  }
}
