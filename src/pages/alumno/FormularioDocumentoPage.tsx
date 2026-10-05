import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import Alerta from '../../components/Alerta'
import FormField from '../../components/form/FormField'
import { Select, TextInput } from '../../components/form/inputs'
import PageHeader from '../../components/PageHeader'
import PantallaEstado, { type TonoEstado } from '../../components/PantallaEstado'
import { useAuth } from '../../context/AuthContext'
import type { CodigoDocumento } from '../../lib/documentos'
import { cartaCompletadaPorEmpresa, type EstadoEmpresa } from '../../lib/empresa'
import { formatearFecha, iniciales } from '../../lib/formato'
import { avisarNuevoProceso } from '../../lib/notificaciones'
import { buscarProcesoPeriodo } from '../../lib/procesos'
import {
  datosDocumentoDefault,
  datosDocumentoSchema,
  solicitudCartaAlumnoDefault,
  solicitudCartaAlumnoSchema,
  type DatosDocumento,
  type DatosDocumentoGuardados,
  type SolicitudCartaAlumno,
} from '../../lib/schemas/documento'
import { buscarDocumento, crearSolicitud } from '../../lib/solicitudes'
import type { Persona } from '../../lib/types'

type Estado = 'cargando' | 'no-disponible' | 'libre' | 'pendiente' | 'aceptada' | 'enviada'

const FECHAS_EDITABLES = ['fechaInicio', 'horarioInicio', 'horarioFin']

const ICONOS_DOCUMENTO: Record<CodigoDocumento, string> = {
  carta_aceptacion: 'fa-solid fa-envelope',
  avance: 'fa-solid fa-clipboard-list',
  cierre: 'fa-solid fa-flag-checkered',
}

const PASO_DOCUMENTO: Record<CodigoDocumento, number> = {
  carta_aceptacion: 1,
  avance: 2,
  cierre: 3,
}

const TITULOS_DOCUMENTO: Record<CodigoDocumento, string> = {
  carta_aceptacion: 'Carta de aceptaciÃ³n',
  avance: 'Avance',
  cierre: 'Cierre',
}

/* -------------------------------------------------------------------------- */
/* Piezas de presentaciÃ³n                                                      */
/* -------------------------------------------------------------------------- */

function Encabezado({
  icono,
  titulo,
  eyebrow,
  paso,
  folio,
}: {
  icono: string
  titulo: string
  eyebrow: string
  paso: number
  folio: string | null
}) {
  return (
    <PageHeader
      icono={icono}
      titulo={titulo}
      eyebrow={eyebrow}
      meta={
        <>
          <span className="etiqueta">Paso {paso} de 3</span>
          {folio && (
            <span className="etiqueta">
              <i className="fa-solid fa-hashtag" aria-hidden="true" />
              <span className="font-mono">{folio}</span>
            </span>
          )}
          <Link to="/alumno/documentos" className="btn btn-ghost btn-sm">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Volver
          </Link>
        </>
      }
    />
  )
}

function Seccion({
  icono,
  titulo,
  accion,
  children,
}: {
  icono: string
  titulo: string
  accion?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2.5 border-b border-line pb-3.5">
        <i className={`${icono} text-base text-brand`} aria-hidden="true" />
        <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink">{titulo}</h2>
        {accion && <div className="ml-auto">{accion}</div>}
      </div>
      {children}
    </section>
  )
}

function TarjetaAlumno({ profile }: { profile: Persona }) {
  return (
    <section className="card flex flex-wrap items-center gap-4 p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white">
        {iniciales(profile.nombre)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-brand">Alumno</p>
        <p className="mt-0.5 text-base font-bold text-ink">{profile.nombre}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink/50">
          <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
          {profile.carreras?.nombre ?? 'â€”'}
        </p>
      </div>
      <span className="etiqueta shrink-0">
        <span className="text-ink/40">ID</span>
        <span className="font-mono">{profile.id}</span>
      </span>
    </section>
  )
}

function PantallaDocumento({
  icono,
  tono,
  titulo,
  texto,
}: {
  icono: string
  tono: TonoEstado
  titulo: string
  texto: string
}) {
  return (
    <PantallaEstado icono={icono} tono={tono} titulo={titulo} descripcion={texto}>
      <Link to="/alumno/documentos" className="btn btn-primary btn-block">
        Volver a mis documentos
      </Link>
    </PantallaEstado>
  )
}

function BloqueActividades({
  fields,
  registrar,
  onQuitar,
  errorDe,
  errorLista,
  deshabilitado,
  hint,
}: {
  fields: { id: string }[]
  registrar: (index: number) => object
  onQuitar: (index: number) => void
  errorDe: (index: number) => string | undefined
  errorLista?: string
  deshabilitado: boolean
  hint?: string
}) {
  return (
    <>
      {hint && <p className="-mt-1 mb-4 text-xs leading-relaxed text-ink/45">{hint}</p>}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <FormField label={`Actividad ${index + 1}`} required error={errorDe(index)}>
              <TextInput
                {...registrar(index)}
                placeholder="Ej. Desarrollo y documentaciÃ³n de soluciones digitales"
                disabled={deshabilitado}
              />
            </FormField>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onQuitar(index)}
              disabled={fields.length === 1 || deshabilitado}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
              Quitar
            </button>
          </div>
        ))}
      </div>
      {errorLista && <p className="mt-3 text-xs font-semibold text-danger">{errorLista}</p>}
    </>
  )
}

function BotonEnviar({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Enviandoâ€¦
        </>
      ) : (
        <>
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          Enviar solicitud
        </>
      )}
    </button>
  )
}

function Cargando({ icono, titulo }: { icono: string; titulo: string }) {
  return (
    <div>
      <PageHeader
        icono={icono}
        titulo={titulo}
        eyebrow="Solicitud de documento"
        meta={
          <Link to="/alumno/documentos" className="btn btn-ghost btn-sm">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Volver
          </Link>
        }
      />
      <div className="card flex items-center gap-3 p-5 text-sm text-ink/55">
        <span className="spinner text-brand" aria-hidden="true" />
        Verificando tu proceso de prÃ¡cticasâ€¦
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Transformaciones de datos guardados                                          */
/* -------------------------------------------------------------------------- */

function cartaAFormulario(datos: Record<string, unknown>): SolicitudCartaAlumno {
  const actividades = Array.isArray(datos['actividades'])
    ? (datos['actividades'] as unknown[])
        .map((item) => (typeof item === 'string' ? item : ''))
        .filter((item) => item.length > 0)
        .map((valor) => ({ valor }))
    : []
  return {
    empresa: typeof datos['empresa'] === 'string' ? (datos['empresa'] as string) : '',
    lugar: typeof datos['lugar'] === 'string' ? (datos['lugar'] as string) : '',
    supervisor: typeof datos['supervisor'] === 'string' ? (datos['supervisor'] as string) : '',
    puestoSupervisor:
      typeof datos['puestoSupervisor'] === 'string' ? (datos['puestoSupervisor'] as string) : '',
    correoSupervisor:
      typeof datos['correoSupervisor'] === 'string' ? (datos['correoSupervisor'] as string) : '',
    actividades: actividades.length > 0 ? actividades : solicitudCartaAlumnoDefault.actividades,
  }
}

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

/* -------------------------------------------------------------------------- */
/* Carta de aceptaciÃ³n: lo captura el alumno                                   */
/* -------------------------------------------------------------------------- */

function FormularioCartaAlumno({ profile }: { profile: Persona }) {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [creadoEn, setCreadoEn] = useState<string | null>(null)
  const [folio, setFolio] = useState<string | null>(null)
  const [empresaEstado, setEmpresaEstado] = useState<EstadoEmpresa | null>(null)
  const [empresaExpira, setEmpresaExpira] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SolicitudCartaAlumno>({
    resolver: zodResolver(solicitudCartaAlumnoSchema),
    defaultValues: solicitudCartaAlumnoDefault,
    mode: 'onTouched',
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'actividades' })
  const soloLectura = estado === 'pendiente' || estado === 'aceptada'
  const bloqueado = soloLectura || isSubmitting

  useEffect(() => {
    let cancelado = false
    buscarProcesoPeriodo(profile.id)
      .then(async (proceso) => {
        if (cancelado) return
        const vigente = proceso && proceso.estado !== 'rechazada' ? proceso : null
        if (vigente) {
          const enviado = await buscarDocumento(vigente.id, 'carta_aceptacion')
          if (cancelado) return
          if (enviado) {
            reset(cartaAFormulario(enviado.datos as Record<string, unknown>))
            setCreadoEn(enviado.creado_en)
            setFolio(vigente.folio)
            setEmpresaEstado(vigente.empresa_estado)
            setEmpresaExpira(vigente.empresa_expira_en)
            setEstado(vigente.estado === 'aceptada' ? 'aceptada' : 'pendiente')
            return
          }
        }
        setEstado('libre')
      })
      .catch(() => {
        if (!cancelado) setEstado('libre')
      })
    return () => {
      cancelado = true
    }
  }, [profile.id, recarga, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (soloLectura) return
    setErrorEnvio(null)
    try {
      const folioEnviado = await crearSolicitud(profile.id, 'carta_aceptacion', {
        ...values,
        actividades: values.actividades.map((actividad) => actividad.valor),
        origen: 'alumno',
        completada_empresa: false,
      })
      setFolio(folioEnviado)
      setEstado('enviada')
      void avisarNuevoProceso(folioEnviado).catch((error) => {
        console.error('No se pudo enviar el aviso del folio:', error)
      })
    } catch (error) {
      setErrorEnvio(error instanceof Error ? error.message : 'No se pudo enviar la solicitud')
      setRecarga((valor) => valor + 1)
    }
  })

  if (estado === 'cargando') {
    return <Cargando icono={ICONOS_DOCUMENTO.carta_aceptacion} titulo="Carta de aceptaciÃ³n" />
  }

  if (estado === 'enviada') {
    return (
      <PantallaDocumento
        icono="fa-solid fa-circle-check"
        tono="ok"
        titulo="Solicitud enviada"
        texto={`Tu carta del proceso ${folio ?? ''} quedÃ³ pendiente de confirmaciÃ³n por la coordinaciÃ³n. DespuÃ©s la empresa completarÃ¡ los datos faltantes.`}
      />
    )
  }

  return (
    <div>
      <Encabezado
        icono={ICONOS_DOCUMENTO.carta_aceptacion}
        titulo={TITULOS_DOCUMENTO.carta_aceptacion}
        eyebrow="Solicitud de documento"
        paso={PASO_DOCUMENTO.carta_aceptacion}
        folio={folio}
      />

      <div className="space-y-4">
        {soloLectura && estado !== 'aceptada' && empresaEstado === 'no_enviada' && (
          <Alerta
            icono="fa-solid fa-hourglass-half"
            tono="warn"
            titulo={`Pendiente de confirmaciÃ³n por la coordinaciÃ³n${creadoEn ? ` Â· enviada el ${formatearFecha(creadoEn)}` : ''}`}
          >
            Cuando la coordinaciÃ³n confirme, se enviarÃ¡ un enlace temporal a la empresa.
          </Alerta>
        )}

        {soloLectura && estado !== 'aceptada' && empresaEstado === 'enviada' && (
          <Alerta icono="fa-solid fa-paper-plane" tono="info" titulo="Enlace enviado a la empresa">
            La empresa debe completar los datos faltantes
            {empresaExpira ? ` antes del ${formatearFecha(empresaExpira)}` : ''}.
          </Alerta>
        )}

        {soloLectura && estado !== 'aceptada' && empresaEstado === 'completada' && (
          <Alerta icono="fa-solid fa-circle-check" tono="ok" titulo="Carta completa">
            La empresa ya completÃ³ los datos. Puedes solicitar avance y cierre.
          </Alerta>
        )}

        {soloLectura && estado === 'aceptada' && (
          <Alerta icono="fa-solid fa-circle-check" tono="ok" titulo="Solicitud aceptada">
            La coordinaciÃ³n aprobÃ³ tu proceso. No es posible modificar los datos.
          </Alerta>
        )}

        {errorEnvio && (
          <Alerta icono="fa-solid fa-circle-exclamation" tono="danger">
            {errorEnvio}
          </Alerta>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <TarjetaAlumno profile={profile} />

          <Seccion icono="fa-solid fa-building" titulo="Empresa">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Empresa" required error={errors.empresa?.message}>
                <TextInput
                  {...register('empresa')}
                  placeholder="Ej. Empresa Demo, S.A. de C.V."
                  disabled={bloqueado}
                />
              </FormField>
              <FormField label="Lugar" required error={errors.lugar?.message}>
                <TextInput
                  {...register('lugar')}
                  placeholder="Ej. Altamira, Tamaulipas"
                  disabled={bloqueado}
                />
              </FormField>
            </div>
          </Seccion>

          <Seccion icono="fa-solid fa-user-tie" titulo="Supervisor">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Supervisor" required error={errors.supervisor?.message}>
                <TextInput
                  {...register('supervisor')}
                  placeholder="Ej. Ing. Andrea Morales"
                  disabled={bloqueado}
                />
              </FormField>
              <FormField label="Puesto del supervisor" required error={errors.puestoSupervisor?.message}>
                <TextInput
                  {...register('puestoSupervisor')}
                  placeholder="Ej. LÃ­der de Proyectos Digitales"
                  disabled={bloqueado}
                />
              </FormField>
              <FormField label="Correo del supervisor" required error={errors.correoSupervisor?.message}>
                <TextInput
                  type="email"
                  {...register('correoSupervisor')}
                  placeholder="Ej. supervisor@empresa.com"
                  disabled={bloqueado}
                />
              </FormField>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink/45">
              A este correo llegarÃ¡ el enlace temporal para que la empresa complete giro, tamaÃ±o,
              fechas, horarios y directivo.
            </p>
          </Seccion>

          <Seccion
            icono="fa-solid fa-list-check"
            titulo="Actividades"
            accion={
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => append({ valor: '' })}
                disabled={bloqueado}
              >
                <i className="fa-solid fa-plus" aria-hidden="true" />
                Agregar
              </button>
            }
          >
            <BloqueActividades
              fields={fields}
              registrar={(index) => register(`actividades.${index}.valor`)}
              onQuitar={remove}
              errorDe={(index) => errors.actividades?.[index]?.valor?.message}
              errorLista={errors.actividades?.message}
              deshabilitado={bloqueado}
            />
          </Seccion>

          {!soloLectura && (
            <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-ink/50">
                <i className="fa-solid fa-circle-info mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                Al enviar se abre tu proceso y la coordinaciÃ³n confirmarÃ¡ antes de avisar a la empresa.
              </p>
              <BotonEnviar isSubmitting={isSubmitting} />
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Avance y cierre: se desbloquean con la carta completa                        */
/* -------------------------------------------------------------------------- */

function FormularioDocumento({ profile, documento }: { profile: Persona; documento: CodigoDocumento }) {
  const esCarta = documento === 'carta_aceptacion'
  const soloFechas = !esCarta

  const [estado, setEstado] = useState<Estado>('cargando')
  const [faltaEmpresa, setFaltaEmpresa] = useState(false)
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

  const { fields, append, remove } = useFieldArray({ control, name: 'actividades' })

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
            setFaltaEmpresa(false)
            setEstado('no-disponible')
            return
          }
          if (!cartaCompletadaPorEmpresa(carta.datos)) {
            setFaltaEmpresa(true)
            setEstado('no-disponible')
            return
          }
          setFaltaEmpresa(false)
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
    return <Cargando icono={ICONOS_DOCUMENTO[documento]} titulo={TITULOS_DOCUMENTO[documento]} />
  }

  if (estado === 'no-disponible') {
    return (
      <PantallaDocumento
        icono="fa-solid fa-circle-info"
        tono="brand"
        titulo={
          faltaEmpresa ? 'La empresa aÃºn no completa la carta' : 'Primero solicita la carta de aceptaciÃ³n'
        }
        texto={
          faltaEmpresa
            ? 'La carta estÃ¡ pendiente de confirmaciÃ³n o de los datos de la empresa. Cuando la empresa complete giro, tamaÃ±o, fechas, horarios y directivo, podrÃ¡s solicitar avance y cierre.'
            : 'Para abrir un proceso de prÃ¡cticas debes enviar primero tu carta de aceptaciÃ³n. DespuÃ©s podrÃ¡s solicitar el avance y el cierre con los mismos datos.'
        }
      />
    )
  }

  if (estado === 'enviada') {
    return (
      <PantallaDocumento
        icono="fa-solid fa-circle-check"
        tono="ok"
        titulo="Solicitud enviada"
        texto={`Tu solicitud del proceso ${folio ?? ''} fue enviada correctamente. La coordinaciÃ³n la revisarÃ¡ y podrÃ¡s consultar el resultado en el panel de documentos.`}
      />
    )
  }

  return (
    <div>
      <Encabezado
        icono={ICONOS_DOCUMENTO[documento]}
        titulo={TITULOS_DOCUMENTO[documento]}
        eyebrow={esCarta ? 'Solicitud de documento' : 'Constancia de avance / cierre'}
        paso={PASO_DOCUMENTO[documento]}
        folio={folio}
      />

      <div className="space-y-4">
        {soloLectura && (
          <Alerta
            icono={estado === 'aceptada' ? 'fa-solid fa-circle-check' : 'fa-solid fa-hourglass-half'}
            tono={estado === 'aceptada' ? 'ok' : 'warn'}
            titulo={`${estado === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud en espera de revisiÃ³n'}${creadoEn ? ` Â· enviada el ${formatearFecha(creadoEn)}` : ''}`}
          >
            {estado === 'aceptada'
              ? 'La coordinaciÃ³n aprobÃ³ tu solicitud. No es posible modificar los datos.'
              : 'La coordinaciÃ³n revisarÃ¡ tu solicitud y el resultado aparecerÃ¡ en tu panel de documentos.'}
          </Alerta>
        )}

        {soloFechasEditables && (
          <Alerta icono="fa-solid fa-copy" tono="info" titulo="Datos copiados de tu carta de aceptaciÃ³n">
            Solo puedes modificar la fecha de inicio y los horarios.
          </Alerta>
        )}

        {errorEnvio && (
          <Alerta icono="fa-solid fa-circle-exclamation" tono="danger">
            {errorEnvio}
          </Alerta>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <TarjetaAlumno profile={profile} />

          <Seccion icono="fa-solid fa-building" titulo="Empresa">
            <div className="grid gap-4 sm:grid-cols-2">
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
              <FormField label="Tipo" required error={errors.tipoOrganizacion?.message}>
                <Select
                  {...register('tipoOrganizacion')}
                  disabled={!editable('tipoOrganizacion') || isSubmitting}
                >
                  <option value="Privada">Privada</option>
                  <option value="PÃºblica">PÃºblica</option>
                </Select>
              </FormField>
              <FormField label="TamaÃ±o" required error={errors.tamano?.message}>
                <Select {...register('tamano')} disabled={!editable('tamano') || isSubmitting}>
                  <option value="PequeÃ±a">PequeÃ±a</option>
                  <option value="Mediana">Mediana</option>
                  <option value="Grande">Grande</option>
                </Select>
              </FormField>
            </div>
          </Seccion>

          <Seccion icono="fa-solid fa-calendar-days" titulo="Fechas y horario">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Fecha de inicio" required error={errors.fechaInicio?.message}>
                <TextInput
                  type="date"
                  {...register('fechaInicio')}
                  disabled={!editable('fechaInicio') || isSubmitting}
                />
              </FormField>
              <FormField label="DÃ­as" required error={errors.dias?.message}>
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
          </Seccion>

          <Seccion icono="fa-solid fa-user-tie" titulo="SupervisiÃ³n y autorizaciÃ³n">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  placeholder="Ej. LÃ­der de Proyectos Digitales"
                  disabled={!editable('puestoSupervisor') || isSubmitting}
                />
              </FormField>
              <FormField label="Directivo que autoriza" required error={errors.directivo?.message}>
                <TextInput
                  {...register('directivo')}
                  placeholder="Ej. Lic. Roberto MartÃ­nez"
                  disabled={!editable('directivo') || isSubmitting}
                />
              </FormField>
            </div>
          </Seccion>

          <Seccion
            icono="fa-solid fa-list-check"
            titulo="Actividades"
            accion={
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => append({ valor: '' })}
                disabled={!editable('actividades') || isSubmitting}
              >
<i className="fa-solid fa-plus" aria-hidden="true" />
                Agregar
              </button>
            }
          >
            <BloqueActividades
              fields={fields}
              registrar={(index) => register(`actividades.${index}.valor`)}
              onQuitar={remove}
              errorDe={(index) => errors.actividades?.[index]?.valor?.message}
              errorLista={errors.actividades?.message}
              deshabilitado={!editable('actividades') || isSubmitting}
              hint="Describe las actividades que desempeñarás durante tus prácticas."
            />
          </Seccion>

          {!soloLectura && (
            <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-ink/50">
                <i className="fa-solid fa-circle-info mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                {esCarta
                  ? 'Al enviar se abre tu proceso de prÃ¡cticas y la coordinaciÃ³n recibirÃ¡ un aviso.'
                  : 'Al enviar, la coordinaciÃ³n recibirÃ¡ este documento para revisiÃ³n.'}
              </p>
              <BotonEnviar isSubmitting={isSubmitting} />
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default function FormularioDocumentoPage({ documento }: { documento: CodigoDocumento }) {
  const { profile } = useAuth()
  if (!profile) return null
  if (documento === 'carta_aceptacion') return <FormularioCartaAlumno profile={profile} />
  return <FormularioDocumento profile={profile} documento={documento} />
}
