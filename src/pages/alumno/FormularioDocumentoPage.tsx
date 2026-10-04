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
import { cartaCompletadaPorEmpresa, type EstadoEmpresa } from '../../lib/empresa'
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
  carta_aceptacion: 'Carta de aceptación',
  avance: 'Avance',
  cierre: 'Cierre',
}

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0))
    .join('')
    .toUpperCase()
}

function TarjetaAlumno({ profile }: { profile: Persona }) {
  return (
    <section className="card alumno-card">
      <span className="alumno-avatar">{iniciales(profile.nombre)}</span>
      <div className="alumno-info">
        <span className="alumno-rol">Alumno</span>
        <strong className="alumno-nombre">{profile.nombre}</strong>
        <span className="alumno-carrera">
          <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
          {profile.carreras?.nombre ?? '—'}
        </span>
      </div>
      <div className="alumno-id">
        <span className="dato-label">ID</span>
        <span className="alumno-id-valor">{profile.id}</span>
      </div>
    </section>
  )
}

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
    <div>
      <Link to="/alumno/documentos" className="btn btn-ghost btn-sm">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Volver a documentos
      </Link>
      <div className="card gate-card" style={{ marginTop: 14 }}>
        <div className="gate-head">
          <span
            className="logo logo-lg"
            style={{ background: exito ? 'var(--ok)' : 'var(--accent)' }}
          >
            <i
              className={exito ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info'}
              aria-hidden="true"
            />
          </span>
          <div className="gate-title">
            <h1>{titulo}</h1>
            <p>Solicitud de documento</p>
          </div>
        </div>
        <div className="gate-body">
          <p className="quiet" style={{ textAlign: 'center' }}>
            {texto}
          </p>
          <Link to="/alumno/documentos" className="btn btn-primary btn-block">
            Volver a documentos
          </Link>
        </div>
      </div>
    </div>
  )
}

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
    return (
      <div>
        <Link to="/alumno/documentos" className="btn btn-ghost btn-sm">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Volver a documentos
        </Link>
        <p className="quiet field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="spinner spinner-dark" aria-hidden="true" />
          Verificando tu proceso de prácticas…
        </p>
      </div>
    )
  }

  if (estado === 'enviada') {
    return (
      <MensajeEstado
        exito
        titulo="Solicitud enviada"
        texto={`Tu carta del proceso ${folio ?? ''} quedó pendiente de confirmación por la coordinación. Después la empresa completará los datos faltantes.`}
      />
    )
  }

  return (
    <div>
      <div className="top">
        <div className="head-row">
          <div className="head-icon">
            <i className="fa-solid fa-envelope" aria-hidden="true" />
          </div>
          <div className="head-text">
            <h1>Carta de aceptación</h1>
            <span className="head-sub">Solicitud de documento</span>
          </div>
        </div>
        <div className="head-meta">
          <span className="meta-date">Paso 1 de 3</span>
          {folio && (
            <span className="tag">
              <i className="fa-solid fa-hashtag" aria-hidden="true" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{folio}</span>
            </span>
          )}
          <Link to="/alumno/documentos" className="btn btn-ghost btn-sm">
            Volver
          </Link>
        </div>
      </div>

      {soloLectura && estado !== 'aceptada' && empresaEstado === 'no_enviada' && (
        <div className="alert alert-warn">
          <i className="fa-solid fa-hourglass-half" aria-hidden="true" />
          <span>
            <strong style={{ display: 'block' }}>Pendiente de confirmación por la coordinación{creadoEn ? ` · enviada el ${formatearFecha(creadoEn)}` : ''}</strong>
            Cuando la coordinación confirme, se enviará un enlace temporal a la empresa.
          </span>
        </div>
      )}

      {soloLectura && estado !== 'aceptada' && empresaEstado === 'enviada' && (
        <div className="alert alert-info">
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          <span>
            <strong style={{ display: 'block' }}>Enlace enviado a la empresa</strong>
            La empresa debe completar los datos faltantes
            {empresaExpira ? ` antes del ${formatearFecha(empresaExpira)}` : ''}.
          </span>
        </div>
      )}

      {soloLectura && estado !== 'aceptada' && empresaEstado === 'completada' && (
        <div className="alert alert-ok">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span>
            <strong style={{ display: 'block' }}>Carta completa</strong>
            La empresa ya completó los datos. Puedes solicitar avance y cierre.
          </span>
        </div>
      )}

      {soloLectura && estado === 'aceptada' && (
        <div className="alert alert-ok">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span>
            <strong style={{ display: 'block' }}>Solicitud aceptada</strong>
            La coordinación aprobó tu proceso. No es posible modificar los datos.
          </span>
        </div>
      )}

      {errorEnvio && (
        <div className="error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{errorEnvio}</span>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <TarjetaAlumno profile={profile} />

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <div className="form-card-head">
            <span className="sec-icon i-empresa">
              <i className="fa-solid fa-building" aria-hidden="true" />
            </span>
            <h2>Empresa</h2>
          </div>
          <div className="form-row">
            <FormField label="Empresa" required error={errors.empresa?.message}>
              <TextInput
                {...register('empresa')}
                placeholder="Ej. Empresa Demo, S.A. de C.V."
                disabled={soloLectura || isSubmitting}
              />
            </FormField>
            <FormField label="Lugar" required error={errors.lugar?.message}>
              <TextInput
                {...register('lugar')}
                placeholder="Ej. Altamira, Tamaulipas"
                disabled={soloLectura || isSubmitting}
              />
            </FormField>
          </div>
        </section>

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <div className="form-card-head">
            <span className="sec-icon i-supervision">
              <i className="fa-solid fa-user-tie" aria-hidden="true" />
            </span>
            <h2>Supervisor</h2>
          </div>
          <div className="form-row">
            <FormField label="Supervisor" required error={errors.supervisor?.message}>
              <TextInput
                {...register('supervisor')}
                placeholder="Ej. Ing. Andrea Morales"
                disabled={soloLectura || isSubmitting}
              />
            </FormField>
            <FormField label="Puesto del supervisor" required error={errors.puestoSupervisor?.message}>
              <TextInput
                {...register('puestoSupervisor')}
                placeholder="Ej. Líder de Proyectos Digitales"
                disabled={soloLectura || isSubmitting}
              />
            </FormField>
            <FormField label="Correo del supervisor" required error={errors.correoSupervisor?.message}>
              <TextInput
                type="email"
                {...register('correoSupervisor')}
                placeholder="Ej. supervisor@empresa.com"
                disabled={soloLectura || isSubmitting}
              />
            </FormField>
          </div>
          <p className="field-hint">
            A este correo llegará el enlace temporal para que la empresa complete giro, tamaño,
            fechas, horarios y directivo.
          </p>
        </section>

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <div className="form-card-head">
            <span className="sec-icon i-actividades">
              <i className="fa-solid fa-list-check" aria-hidden="true" />
            </span>
            <h2>Actividades</h2>
            <button
              type="button"
              className="btn btn-sm accion"
              onClick={() => append({ valor: '' })}
              disabled={soloLectura || isSubmitting}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Agregar
            </button>
          </div>
          <div className="field">
            {fields.map((field, index) => (
              <div key={field.id} className="form-row" style={{ alignItems: 'flex-end', marginBottom: 12 }}>
                <FormField
                  label={`Actividad ${index + 1}`}
                  required
                  error={errors.actividades?.[index]?.valor?.message}
                >
                  <TextInput
                    {...register(`actividades.${index}.valor`)}
                    placeholder="Ej. Desarrollo y documentación de soluciones digitales"
                    disabled={soloLectura || isSubmitting}
                  />
                </FormField>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1 || soloLectura || isSubmitting}
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                  Quitar
                </button>
              </div>
            ))}
          </div>
          {errors.actividades?.message && (
            <p className="field-hint" style={{ color: 'var(--danger)', fontWeight: 700 }}>
              {errors.actividades.message}
            </p>
          )}
        </section>

        {!soloLectura && (
          <div
            className="card card-pad field"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}
          >
            <p className="quiet" style={{ margin: 0, fontSize: '0.8rem' }}>
              <i className="fa-solid fa-circle-info" aria-hidden="true" /> Al enviar se abre tu
              proceso y la coordinación confirmará antes de avisar a la empresa.
            </p>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                  Enviar solicitud
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

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
    return (
      <div>
        <Link to="/alumno/documentos" className="btn btn-ghost btn-sm">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Volver a documentos
        </Link>
        <p className="quiet field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="spinner spinner-dark" aria-hidden="true" />
          Verificando tu proceso de prácticas…
        </p>
      </div>
    )
  }

  if (estado === 'no-disponible') {
    return (
      <MensajeEstado
        titulo={faltaEmpresa ? 'La empresa aún no completa la carta' : 'Primero solicita la carta de aceptación'}
        texto={
          faltaEmpresa
            ? 'La carta está pendiente de confirmación o de los datos de la empresa. Cuando la empresa complete giro, tamaño, fechas, horarios y directivo, podrás solicitar avance y cierre.'
            : 'Para abrir un proceso de prácticas debes enviar primero tu carta de aceptación. Después podrás solicitar el avance y el cierre con los mismos datos.'
        }
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
    <div>
      <div className="top">
        <div className="head-row">
          <div className="head-icon">
            <i className={ICONOS_DOCUMENTO[documento]} aria-hidden="true" />
          </div>
          <div className="head-text">
            <h1>{TITULOS_DOCUMENTO[documento]}</h1>
            <span className="head-sub">
              {esCarta ? 'Solicitud de documento' : 'Constancia de avance / cierre'}
            </span>
          </div>
        </div>
        <div className="head-meta">
          <span className="meta-date">Paso {PASO_DOCUMENTO[documento]} de 3</span>
          {folio && (
            <span className="tag">
              <i className="fa-solid fa-hashtag" aria-hidden="true" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{folio}</span>
            </span>
          )}
          <Link to="/alumno/documentos" className="btn btn-ghost btn-sm">
            Volver
          </Link>
        </div>
      </div>

      {soloLectura && (
        <div className={`alert ${estado === 'aceptada' ? 'alert-ok' : 'alert-warn'}`}>
          <i
            className={estado === 'aceptada' ? 'fa-solid fa-circle-check' : 'fa-solid fa-hourglass-half'}
            aria-hidden="true"
          />
          <span>
            <strong style={{ display: 'block' }}>
              {estado === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud en espera de revisión'}
              {creadoEn ? ` · enviada el ${formatearFecha(creadoEn)}` : ''}
            </strong>
            {estado === 'aceptada'
              ? 'La coordinación aprobó tu solicitud. No es posible modificar los datos.'
              : 'La coordinación revisará tu solicitud y el resultado aparecerá en tu panel de documentos.'}
          </span>
        </div>
      )}

      {soloFechasEditables && (
        <div className="alert alert-info">
          <i className="fa-solid fa-copy" aria-hidden="true" />
          <span>
            <strong style={{ display: 'block' }}>Datos copiados de tu carta de aceptación</strong>
            Solo puedes modificar la fecha de inicio y los horarios.
          </span>
        </div>
      )}

      {errorEnvio && (
        <div className="error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{errorEnvio}</span>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <TarjetaAlumno profile={profile} />

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <div className="form-card-head">
            <span className="sec-icon i-empresa">
              <i className="fa-solid fa-building" aria-hidden="true" />
            </span>
            <h2>Empresa</h2>
          </div>
          <div className="form-row">
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
        </section>

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <div className="form-card-head">
            <span className="sec-icon i-fechas">
              <i className="fa-solid fa-calendar-days" aria-hidden="true" />
            </span>
            <h2>Fechas y horario</h2>
          </div>
          <div className="form-row">
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

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <div className="form-card-head">
            <span className="sec-icon i-supervision">
              <i className="fa-solid fa-user-tie" aria-hidden="true" />
            </span>
            <h2>Supervisión y autorización</h2>
          </div>
          <div className="form-row">
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
            <FormField label="Directivo que autoriza" required error={errors.directivo?.message}>
              <TextInput
                {...register('directivo')}
                placeholder="Ej. Lic. Roberto Martínez"
                disabled={!editable('directivo') || isSubmitting}
              />
            </FormField>
          </div>
        </section>

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <div className="form-card-head">
            <span className="sec-icon i-actividades">
              <i className="fa-solid fa-list-check" aria-hidden="true" />
            </span>
            <h2>Actividades</h2>
            <button
              type="button"
              className="btn btn-sm accion"
              onClick={() => append({ valor: '' })}
              disabled={!editable('actividades') || isSubmitting}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Agregar
            </button>
          </div>
          <p className="field-hint" style={{ margin: '-6px 0 16px' }}>
            Describe las actividades que desempeñarás durante tus prácticas.
          </p>

          <div className="field">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="form-row"
                style={{ alignItems: 'flex-end', marginBottom: 12 }}
              >
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
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1 || !editable('actividades') || isSubmitting}
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                  Quitar
                </button>
              </div>
            ))}
          </div>
          {errors.actividades?.message && (
            <p className="field-hint" style={{ color: 'var(--danger)', fontWeight: 700 }}>
              {errors.actividades.message}
            </p>
          )}
        </section>

        {!soloLectura && (
          <div
            className="card card-pad field"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <p className="quiet" style={{ margin: 0, fontSize: '0.8rem' }}>
              <i className="fa-solid fa-circle-info" aria-hidden="true" />{' '}
              {esCarta
                ? 'Al enviar se abre tu proceso de prácticas y la coordinación recibirá un aviso.'
                : 'Al enviar, la coordinación recibirá este documento para revisión.'}
            </p>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                  Enviar solicitud
                </>
              )}
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
  if (documento === 'carta_aceptacion') return <FormularioCartaAlumno profile={profile} />
  return <FormularioDocumento profile={profile} documento={documento} />
}