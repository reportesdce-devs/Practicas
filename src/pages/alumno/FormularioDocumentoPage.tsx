import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import FormField from '../../components/form/FormField'
import { Select, TextInput } from '../../components/form/inputs'
import { useAuth } from '../../context/AuthContext'
import type { CodigoDocumento } from '../../lib/documentos'
import { avisarNuevoProceso } from '../../lib/notificaciones'
import { buscarProcesoPeriodo } from '../../lib/procesos'
import {
  datosDocumentoDefault,
  datosDocumentoSchema,
  type DatosDocumento,
  type DatosDocumentoGuardados,
} from '../../lib/schemas/documento'
import { buscarDocumento, crearSolicitud } from '../../lib/solicitudes'
import type { Persona } from '../../lib/types'

type Estado = 'cargando' | 'no-disponible' | 'libre' | 'pendiente' | 'aceptada' | 'enviada'

const FECHAS_EDITABLES = ['fechaInicio', 'horarioInicio', 'horarioFin']

function datosAFormulario(datos: DatosDocumentoGuardados): DatosDocumento {
  const actividades = (Array.isArray(datos.actividades) ? datos.actividades : [])
    .filter((actividad): actividad is string => typeof actividad === 'string')
    .map((valor) => ({ valor }))
  return {
    ...datosDocumentoDefault,
    ...datos,
    actividades: actividades.length > 0 ? actividades : datosDocumentoDefault.actividades,
  }
}

function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

function MensajeEstado({
  titulo,
  texto,
  exito = false,
}: {
  titulo: string
  texto: string
  exito?: boolean
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/alumno/documentos" className="text-sm font-semibold text-brand-dark">
        ← Volver a documentos
      </Link>
      <div
        className={`mt-4 rounded-2xl border bg-white p-8 text-center shadow-sm ${
          exito ? 'border-green-200' : 'border-amber-200'
        }`}
      >
        <h1 className={`text-lg font-bold ${exito ? 'text-green-700' : 'text-amber-700'}`}>
          {titulo}
        </h1>
        <p className="mt-2 text-sm text-gray-600">{texto}</p>
        <Link
          to="/alumno/documentos"
          className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Volver a documentos
        </Link>
      </div>
    </div>
  )
}

function FormularioDocumento({ profile, documento }: { profile: Persona; documento: CodigoDocumento }) {
  const esCarta = documento === 'carta_aceptacion'
  const soloFechas = !esCarta

  const [estado, setEstado] = useState<Estado>('cargando')
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [creadoEn, setCreadoEn] = useState<string | null>(null)
  const [folio, setFolio] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosDocumento>({
    resolver: zodResolver(datosDocumentoSchema),
    defaultValues: datosDocumentoDefault,
    mode: 'onTouched',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'actividades',
  })

  const soloLectura = estado === 'pendiente' || estado === 'aceptada'
  const soloFechasEditables = soloFechas && !soloLectura

  const editable = (campo: string): boolean => {
    if (soloLectura) return false
    if (!soloFechas) return true
    return FECHAS_EDITABLES.includes(campo)
  }

  useEffect(() => {
    let cancelado = false

    buscarProcesoPeriodo(profile.id)
      .then(async (proceso) => {
        if (cancelado) return
        const vigente = proceso && proceso.estado !== 'rechazada' ? proceso : null

        if (vigente) {
          const enviado = await buscarDocumento(vigente.id, documento)
          if (cancelado) return

          if (enviado) {
            reset(datosAFormulario(enviado.datos))
            setCreadoEn(enviado.creado_en)
            setFolio(vigente.folio)
            setEstado(vigente.estado === 'aceptada' ? 'aceptada' : 'pendiente')
            return
          }

          if (esCarta) {
            setEstado('libre')
            return
          }

          const carta = await buscarDocumento(vigente.id, 'carta_aceptacion')
          if (cancelado) return
          if (!carta) {
            setEstado('no-disponible')
            return
          }
          reset(datosAFormulario(carta.datos))
          setFolio(vigente.folio)
          setEstado('libre')
          return
        }

        setEstado(esCarta ? 'libre' : 'no-disponible')
      })
      .catch(() => {
        if (!cancelado) setEstado(esCarta ? 'libre' : 'no-disponible')
      })

    return () => {
      cancelado = true
    }
  }, [documento, esCarta, profile.id, recarga, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (soloLectura) return
    setErrorEnvio(null)
    try {
      const folioEnviado = await crearSolicitud(profile.id, documento, {
        ...values,
        actividades: values.actividades.map((actividad) => actividad.valor),
      })
      setFolio(folioEnviado)
      setEstado('enviada')
      if (esCarta) {
        void avisarNuevoProceso(folioEnviado).catch((error) => {
          console.error('No se pudo enviar el aviso del folio:', error)
        })
      }
    } catch (error) {
      setErrorEnvio(error instanceof Error ? error.message : 'No se pudo enviar la solicitud')
      setRecarga((valor) => valor + 1)
    }
  })

  if (estado === 'cargando') {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/alumno/documentos" className="text-sm font-semibold text-brand-dark">
          ← Volver a documentos
        </Link>
        <p className="mt-6 flex items-center gap-3 text-sm text-gray-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
          Verificando tu proceso de prácticas…
        </p>
      </div>
    )
  }

  if (estado === 'no-disponible') {
    return (
      <MensajeEstado
        titulo="Primero solicita la carta de aceptación"
        texto="Para abrir un proceso de prácticas debes enviar primero tu carta de aceptación. Después podrás solicitar el avance y el cierre con los mismos datos."
      />
    )
  }

  if (estado === 'enviada') {
    return (
      <MensajeEstado
        exito
        titulo="Solicitud enviada"
        texto={`Tu solicitud del proceso ${folio ?? ''} fue enviada correctamente. La coordinación la revisará y podrás consultar el resultado en el panel de documentos.`}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/alumno/documentos" className="text-sm font-semibold text-brand-dark">
        ← Volver a documentos
      </Link>

      <h1 className="mt-4 text-2xl font-bold">
        {esCarta ? 'Solicitud de carta de aceptación' : `Solicitud de constancia de ${documento}`}
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        {soloLectura
          ? 'Revisa los datos que enviaste en tu solicitud. No es posible modificarlos.'
          : soloFechas
            ? 'Los datos se copiaron de tu carta de aceptación. Solo puedes modificar las fechas y horarios.'
            : 'Completa los datos de la empresa donde realizarás tus prácticas.'}
      </p>

      {soloLectura && (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${
            estado === 'aceptada'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <p className="font-semibold">
            {estado === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud en espera de revisión'}
            {folio ? ` · proceso ${folio}` : ''}
            {creadoEn ? ` · enviada el ${formatearFecha(creadoEn)}` : ''}
          </p>
          <p className="mt-1">
            {estado === 'aceptada'
              ? 'La coordinación aprobó tu solicitud. El resultado también aparece en tu panel de documentos.'
              : 'La coordinación revisará tu solicitud y el resultado aparecerá en tu panel de documentos.'}
          </p>
        </div>
      )}

      {soloFechasEditables && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">
            Datos copiados de tu carta de aceptación
            {folio ? ` · proceso ${folio}` : ''}
          </p>
          <p className="mt-1">Solo puedes modificar la fecha de inicio y los horarios.</p>
        </div>
      )}

      {errorEnvio && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {errorEnvio}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Datos del alumno</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <FormField label="Nombre">
              <TextInput value={profile.nombre} disabled readOnly />
            </FormField>
            <FormField label="ID">
              <TextInput value={profile.id} disabled readOnly />
            </FormField>
            <FormField label="Carrera">
              <TextInput value={profile.carreras?.nombre ?? '—'} disabled readOnly />
            </FormField>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Empresa</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Empresa" required error={errors.empresa?.message}>
              <TextInput
                {...register('empresa')}
                placeholder="Ej. Empresa Demo, S.A. de C.V."
                disabled={!editable('empresa') || isSubmitting}
              />
            </FormField>
            <FormField label="Lugar" required error={errors.lugar?.message}>
              <TextInput
                {...register('lugar')}
                placeholder="Ej. Altamira, Tamaulipas"
                disabled={!editable('lugar') || isSubmitting}
              />
            </FormField>
            <FormField label="Giro" required error={errors.giro?.message}>
              <TextInput
                {...register('giro')}
                placeholder="Ej. Servicios"
                disabled={!editable('giro') || isSubmitting}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tipo" required error={errors.tipoOrganizacion?.message}>
                <Select {...register('tipoOrganizacion')} disabled={!editable('tipoOrganizacion') || isSubmitting}>
                  <option value="Privada">Privada</option>
                  <option value="Pública">Pública</option>
                </Select>
              </FormField>
              <FormField label="Tamaño" required error={errors.tamano?.message}>
                <Select {...register('tamano')} disabled={!editable('tamano') || isSubmitting}>
                  <option value="Pequeña">Pequeña</option>
                  <option value="Mediana">Mediana</option>
                  <option value="Grande">Grande</option>
                </Select>
              </FormField>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Fechas y horario</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Fecha de inicio" required error={errors.fechaInicio?.message}>
              <TextInput
                type="date"
                {...register('fechaInicio')}
                disabled={!editable('fechaInicio') || isSubmitting}
              />
            </FormField>
            <FormField label="Días" required error={errors.dias?.message}>
              <TextInput
                {...register('dias')}
                placeholder="Ej. lunes a viernes"
                disabled={!editable('dias') || isSubmitting}
              />
            </FormField>
            <FormField label="Horario de entrada" required error={errors.horarioInicio?.message}>
              <TextInput
                type="time"
                {...register('horarioInicio')}
                disabled={!editable('horarioInicio') || isSubmitting}
              />
            </FormField>
            <FormField label="Horario de salida" required error={errors.horarioFin?.message}>
              <TextInput
                type="time"
                {...register('horarioFin')}
                disabled={!editable('horarioFin') || isSubmitting}
              />
            </FormField>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Supervisión y autorización</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Supervisor" required error={errors.supervisor?.message}>
              <TextInput
                {...register('supervisor')}
                placeholder="Ej. Ing. Andrea Morales"
                disabled={!editable('supervisor') || isSubmitting}
              />
            </FormField>
            <FormField
              label="Puesto del supervisor"
              required
              error={errors.puestoSupervisor?.message}
            >
              <TextInput
                {...register('puestoSupervisor')}
                placeholder="Ej. Líder de Proyectos Digitales"
                disabled={!editable('puestoSupervisor') || isSubmitting}
              />
            </FormField>
            <FormField
              label="Directivo que autoriza"
              required
              error={errors.directivo?.message}
            >
              <TextInput
                {...register('directivo')}
                placeholder="Ej. Lic. Roberto Martínez"
                disabled={!editable('directivo') || isSubmitting}
              />
            </FormField>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold">Actividades</h2>
            <button
              type="button"
              onClick={() => append({ valor: '' })}
              disabled={!editable('actividades') || isSubmitting}
              className="rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand-dark hover:bg-orange-50 disabled:opacity-60"
            >
              + Agregar
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Describe las actividades que desempeñarás durante tus prácticas.
          </p>

          <div className="mt-4 space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FormField
                    label={`Actividad ${index + 1}`}
                    required
                    error={errors.actividades?.[index]?.valor?.message}
                  >
                    <TextInput
                      {...register(`actividades.${index}.valor`)}
                      placeholder="Ej. Desarrollo y documentación de soluciones digitales"
                      disabled={!editable('actividades') || isSubmitting}
                    />
                  </FormField>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1 || !editable('actividades') || isSubmitting}
                  className="mt-7 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          {errors.actividades?.message && (
            <p className="mt-2 text-xs font-semibold text-red-600">{errors.actividades.message}</p>
          )}
        </section>

        {!soloLectura && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

export default function FormularioDocumentoPage({ documento }: { documento: CodigoDocumento }) {
  const { profile } = useAuth()
  if (!profile) return null
  return <FormularioDocumento profile={profile} documento={documento} />
}
