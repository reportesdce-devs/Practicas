import type { DatosDocumentoGuardados } from './schemas/documento'
import { buscarProcesoPeriodo, crearProceso, type Proceso } from './procesos'
import { supabase } from './supabase'

export interface DocumentoEnviado {
  datos: DatosDocumentoGuardados
  creado_en: string
}

export async function buscarDocumento(
  procesoId: number,
  documento: string,
): Promise<DocumentoEnviado | null> {
  const { data, error } = await supabase
    .from('solicitudes')
    .select('datos, creado_en')
    .eq('proceso_id', procesoId)
    .eq('documento', documento)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as DocumentoEnviado | null) ?? null
}

async function procesoParaSolicitud(alumnoId: string, documento: string): Promise<Proceso> {
  const proceso = await buscarProcesoPeriodo(alumnoId)
  if (proceso?.estado === 'pendiente') return proceso
  if (proceso?.estado === 'aceptada') {
    throw new Error('Tu proceso de este periodo ya fue aceptado; no puedes agregar documentos.')
  }
  if (documento !== 'carta_aceptacion') {
    throw new Error('Primero solicita la carta de aceptación para abrir un proceso.')
  }
  return crearProceso(alumnoId)
}

export async function crearSolicitud(
  alumnoId: string,
  documento: string,
  datos: Record<string, unknown>,
): Promise<string> {
  const proceso = await procesoParaSolicitud(alumnoId, documento)

  const { error } = await supabase.from('solicitudes').insert({
    alumno_id: alumnoId,
    proceso_id: proceso.id,
    documento,
    datos,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya solicitaste este documento en tu proceso actual.')
    }
    if (error.code === '42501') {
      throw new Error('No tienes permisos para enviar este documento.')
    }
    throw new Error(error.message)
  }

  return proceso.folio
}
