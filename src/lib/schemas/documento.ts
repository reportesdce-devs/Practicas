import { z } from 'zod'

export const datosDocumentoSchema = z.object({
  empresa: z.string().trim().min(3, 'Escribe el nombre de la empresa'),
  lugar: z.string().trim().min(3, 'Escribe la ciudad y estado'),
  giro: z.string().trim().min(3, 'Escribe el giro de la empresa'),
  tipoOrganizacion: z.enum(['Privada', 'Pública'], { error: 'Selecciona el tipo' }),
  tamano: z.enum(['Pequeña', 'Mediana', 'Grande'], { error: 'Selecciona el tamaño' }),
  fechaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona la fecha de inicio'),
  horarioInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato 09:00'),
  horarioFin: z.string().regex(/^\d{2}:\d{2}$/, 'Formato 14:00'),
  dias: z.string().trim().min(3, 'Indica los días de trabajo'),
  supervisor: z.string().trim().min(3, 'Nombre del supervisor'),
  puestoSupervisor: z.string().trim().min(3, 'Puesto del supervisor'),
  directivo: z.string().trim().min(3, 'Nombre del directivo que autoriza'),
  actividades: z
    .array(
      z.object({
        valor: z.string().trim().min(3, 'Describe la actividad'),
      }),
    )
    .min(1, 'Agrega al menos una actividad'),
})

export type DatosDocumento = z.infer<typeof datosDocumentoSchema>

export type DatosDocumentoGuardados = Omit<DatosDocumento, 'actividades'> & {
  actividades: string[]
}

export const datosDocumentoDefault: DatosDocumento = {
  empresa: '',
  lugar: '',
  giro: '',
  tipoOrganizacion: 'Privada',
  tamano: 'Mediana',
  fechaInicio: '',
  horarioInicio: '',
  horarioFin: '',
  dias: '',
  supervisor: '',
  puestoSupervisor: '',
  directivo: '',
  actividades: [{ valor: '' }],
}
