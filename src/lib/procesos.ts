import { supabase } from './supabase'

export type EstadoProceso = 'pendiente' | 'aceptada' | 'rechazada'

export interface Proceso {
  id: number
  folio: string
  alumno_id: string
  periodo: string
  estado: EstadoProceso
  creado_en: string
}

export interface SolicitudResumen {
  id: number
  documento: string
  datos: Record<string, unknown>
  creado_en: string
}

export interface ProcesoConDocumentos extends Proceso {
  personas: {
    nombre: string
    correo: string | null
    carreras: { id: number; nombre: string; sigla: string | null } | null
  } | null
  solicitudes: SolicitudResumen[]
}

const SELECT_PROCESO = 'id, folio, alumno_id, periodo, estado, creado_en'

export function periodoActual(): string {
  const ahora = new Date()
  const mes = ahora.getMonth() + 1
  return `${ahora.getFullYear()}-${mes >= 8 ? '2' : '1'}`
}

export async function buscarProcesoPeriodo(alumnoId: string): Promise<Proceso | null> {
  const vigente = await supabase
    .from('procesos')
    .select(SELECT_PROCESO)
    .eq('alumno_id', alumnoId)
    .eq('periodo', periodoActual())
    .in('estado', ['pendiente', 'aceptada'])
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (vigente.error) throw new Error(vigente.error.message)
  if (vigente.data) return vigente.data as Proceso

  const ultimo = await supabase
    .from('procesos')
    .select(SELECT_PROCESO)
    .eq('alumno_id', alumnoId)
    .eq('periodo', periodoActual())
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ultimo.error) throw new Error(ultimo.error.message)
  return (ultimo.data as Proceso | null) ?? null
}

export async function buscarProcesoConDocumentos(
  alumnoId: string,
): Promise<ProcesoConDocumentos | null> {
  const select = `
    ${SELECT_PROCESO},
    solicitudes(id, documento, datos, creado_en)
  `

  const vigente = await supabase
    .from('procesos')
    .select(select)
    .eq('alumno_id', alumnoId)
    .eq('periodo', periodoActual())
    .in('estado', ['pendiente', 'aceptada'])
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (vigente.error) throw new Error(vigente.error.message)
  if (vigente.data) return vigente.data as ProcesoConDocumentos

  const ultimo = await supabase
    .from('procesos')
    .select(select)
    .eq('alumno_id', alumnoId)
    .eq('periodo', periodoActual())
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ultimo.error) throw new Error(ultimo.error.message)
  return (ultimo.data as ProcesoConDocumentos | null) ?? null
}

export async function crearProceso(alumnoId: string): Promise<Proceso> {
  for (let intento = 0; intento < 3; intento++) {
    const vigente = await buscarProcesoPeriodo(alumnoId)
    if (vigente?.estado === 'pendiente') return vigente
    if (vigente?.estado === 'aceptada') {
      throw new Error('Tu proceso de este periodo ya fue aceptado; no puedes agregar más documentos.')
    }

    const { data, error } = await supabase
      .from('procesos')
      .insert({ alumno_id: alumnoId, periodo: periodoActual() })
      .select(SELECT_PROCESO)
      .single()

    if (!error) return data as Proceso
    if (error.code === '23505') continue
    if (error.code === '42501') {
      throw new Error('No tienes permisos para crear un proceso de prácticas.')
    }
    throw new Error(error.message)
  }
  throw new Error('No se pudo crear el proceso. Intenta de nuevo.')
}

export async function listarProcesos(): Promise<ProcesoConDocumentos[]> {
  const { data, error } = await supabase
    .from('procesos')
    .select(
      `
      ${SELECT_PROCESO},
      personas:alumno_id(nombre, correo, carreras(id, nombre, sigla)),
      solicitudes(id, documento, datos, creado_en)
    `,
    )
    .order('creado_en', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ProcesoConDocumentos[]
}

export async function cambiarEstadoProceso(id: number, estado: EstadoProceso): Promise<void> {
  const { error } = await supabase.from('procesos').update({ estado }).eq('id', id)

  if (error) {
    if (error.code === '42501') {
      throw new Error(
        'No tienes permisos para modificar este proceso. Se requiere rol de coordinador.',
      )
    }
    throw new Error(error.message)
  }
}
