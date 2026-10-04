import type { ComplementoEmpresa } from './schemas/documento'
import { supabase } from './supabase'

export interface PrefillEmpresa {
  folio: string
  periodo: string
  expira_en: string
  alumno: {
    empresa: string
    lugar: string
    supervisor: string
    puestoSupervisor: string
    actividades: string[]
  }
  empresa: ComplementoEmpresa
}

async function leerRespuestaError(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { error?: unknown }
    if (typeof cuerpo.error === 'string' && cuerpo.error) return cuerpo.error
  } catch {
    // ignorar
  }
  return `La operación falló (HTTP ${respuesta.status})`
}

export async function invitarEmpresa(procesoId: number, reenviar = false): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Inicia sesión de nuevo para enviar el enlace.')

  const respuesta = await fetch('/api/empresa-invitar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ proceso_id: procesoId, reenviar }),
  })
  if (!respuesta.ok) throw new Error(await leerRespuestaError(respuesta))
  const cuerpo = (await respuesta.json()) as { expira_en?: string }
  if (!cuerpo.expira_en) throw new Error('La invitación no devolvió vigencia.')
  return cuerpo.expira_en
}

export async function obtenerPrefillEmpresa(token: string): Promise<PrefillEmpresa> {
  const respuesta = await fetch(`/api/empresa?token=${encodeURIComponent(token)}`)
  if (!respuesta.ok) throw new Error(await leerRespuestaError(respuesta))
  return (await respuesta.json()) as PrefillEmpresa
}

export async function guardarComplementoEmpresa(
  token: string,
  datos: ComplementoEmpresa,
): Promise<string> {
  const respuesta = await fetch('/api/empresa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, datos }),
  })
  if (!respuesta.ok) throw new Error(await leerRespuestaError(respuesta))
  const cuerpo = (await respuesta.json()) as { folio?: string }
  return cuerpo.folio ?? ''
}
