import { z } from 'zod'

const actividadesFormularioSchema = z
  .array(
    z.object({
      valor: z.string().trim().min(3, 'Describe la actividad'),
    }),
  )
  .min(1, 'Agrega al menos una actividad')

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
  actividades: actividadesFormularioSchema,
})

export type DatosDocumento = z.infer<typeof datosDocumentoSchema>

export type DatosDocumentoGuardados = Omit<DatosDocumento, 'actividades'> & {
  actividades: string[]
}

// Carta mínima registrada por el alumno. La empresa completa el resto.
export const solicitudCartaAlumnoSchema = z.object({
  empresa: z.string().trim().min(3, 'Escribe el nombre de la empresa'),
  lugar: z.string().trim().min(3, 'Escribe la ciudad y estado'),
  supervisor: z.string().trim().min(3, 'Nombre del supervisor'),
  puestoSupervisor: z.string().trim().min(3, 'Puesto del supervisor'),
  correoSupervisor: z.email({ error: 'Escribe el correo del supervisor' }),
  actividades: actividadesFormularioSchema,
})

export type SolicitudCartaAlumno = z.infer<typeof solicitudCartaAlumnoSchema>

export const solicitudCartaAlumnoDefault: SolicitudCartaAlumno = {
  empresa: '',
  lugar: '',
  supervisor: '',
  puestoSupervisor: '',
  correoSupervisor: '',
  actividades: [{ valor: '' }],
}

export interface CartaAlumnoGuardada {
  empresa: string
  lugar: string
  supervisor: string
  puestoSupervisor: string
  correoSupervisor: string
  actividades: string[]
  origen: 'alumno'
  completada_empresa: false
}

// Datos que completa la empresa con el enlace temporal.
export const complementoEmpresaSchema = z
  .object({
    giro: z.string().trim().min(3, 'Escribe el giro de la empresa'),
    tipoOrganizacion: z.enum(['Privada', 'Pública'], { error: 'Selecciona el tipo' }),
    tamano: z.enum(['Pequeña', 'Mediana', 'Grande'], { error: 'Selecciona el tamaño' }),
    fechaInicio: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona la fecha de inicio'),
    horarioInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato 09:00'),
    horarioFin: z.string().regex(/^\d{2}:\d{2}$/, 'Formato 14:00'),
    dias: z.string().trim().min(3, 'Indica los días de trabajo'),
    directivo: z.string().trim().min(3, 'Nombre del directivo que autoriza'),
  })
  .refine((valores) => valores.horarioFin > valores.horarioInicio, {
    message: 'El horario de salida debe ser posterior a la entrada',
    path: ['horarioFin'],
  })

export type ComplementoEmpresa = z.infer<typeof complementoEmpresaSchema>

export interface CartaCompletaGuardada extends DatosDocumentoGuardados {
  correoSupervisor: string
  origen: 'alumno'
  completada_empresa: true
  completada_empresa_en?: string
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
