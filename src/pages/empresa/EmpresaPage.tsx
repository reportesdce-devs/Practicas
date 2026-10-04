import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import FormField from '../../components/form/FormField'
import { Select, TextInput } from '../../components/form/inputs'
import { guardarComplementoEmpresa, obtenerPrefillEmpresa, type PrefillEmpresa } from '../../lib/empresaApi'
import { complementoEmpresaSchema, type ComplementoEmpresa } from '../../lib/schemas/documento'

type Estado = 'cargando' | 'lista' | 'guardada' | 'error'

function formatearFecha(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).format(fecha)
}

export default function EmpresaPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [estado, setEstado] = useState<Estado>('cargando')
  const [prefill, setPrefill] = useState<PrefillEmpresa | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [folio, setFolio] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComplementoEmpresa>({
    resolver: zodResolver(complementoEmpresaSchema),
    mode: 'onTouched',
  })

  useEffect(() => {
    let cancelado = false
    if (!token) {
      setMensaje('Enlace inválido o vencido. Pide a la coordinación un nuevo enlace.')
      setEstado('error')
      return
    }
    obtenerPrefillEmpresa(token)
      .then((datos) => {
        if (cancelado) return
        setPrefill(datos)
        reset(datos.empresa)
        setEstado('lista')
      })
      .catch((error) => {
        if (cancelado) return
        setMensaje(error instanceof Error ? error.message : 'Enlace inválido o vencido.')
        setEstado('error')
      })
    return () => {
      cancelado = true
    }
  }, [token, reset])

  const onSubmit = handleSubmit(async (values) => {
    setMensaje(null)
    try {
      const folioGuardado = await guardarComplementoEmpresa(token, values)
      setFolio(folioGuardado)
      setEstado('guardada')
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo guardar la información')
    }
  })

  return (
    <div className="empresa-page">
      <div className="empresa-app">
        <div className="card gate-card">
          <div className="gate-head">
            <img className="gate-logo" src="/logo-dce.png" alt="Logo de Ingenierías" />
          </div>
          <div className="gate-body">
            <div className="login-head">
              <span className="login-icon">
                <i className="fa-solid fa-building" aria-hidden="true" />
              </span>
              <h2>Completa los datos de la empresa</h2>
              <p className="login-desc">
                Revisa la información registrada por el alumno y completa los datos faltantes. Al
                guardar, el enlace se desactiva.
              </p>
            </div>
            {prefill && (
              <div className="head-meta" style={{ justifyContent: 'center' }}>
                <span className="tag">
                  <i className="fa-solid fa-hashtag" aria-hidden="true" />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{prefill.folio}</span>
                </span>
                <span className="meta-date">Vence {formatearFecha(prefill.expira_en)}</span>
              </div>
            )}
          </div>
        </div>

        {estado === 'cargando' && (
          <p className="quiet field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="spinner spinner-dark" aria-hidden="true" />
            Validando el enlace…
          </p>
        )}

        {estado === 'error' && (
          <div className="card card-pad" style={{ marginTop: 14 }}>
            <div className="error" style={{ marginBottom: 0 }}>
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
              <span>{mensaje ?? 'Enlace inválido o vencido.'}</span>
            </div>
          </div>
        )}

        {estado === 'lista' && prefill && (
          <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
            <section className="card card-pad">
              <div className="form-card-head">
                <h2>Información del alumno (solo lectura)</h2>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <span className="dato-label">Empresa</span>
                  <span className="dato-valor">{prefill.alumno.empresa || '—'}</span>
                </div>
                <div className="form-group">
                  <span className="dato-label">Lugar</span>
                  <span className="dato-valor">{prefill.alumno.lugar || '—'}</span>
                </div>
                <div className="form-group">
                  <span className="dato-label">Supervisor</span>
                  <span className="dato-valor">{prefill.alumno.supervisor || '—'}</span>
                </div>
                <div className="form-group">
                  <span className="dato-label">Puesto</span>
                  <span className="dato-valor">{prefill.alumno.puestoSupervisor || '—'}</span>
                </div>
              </div>
              <div className="form-section-label">Actividades</div>
              <ol className="form-group" style={{ marginTop: 6, paddingLeft: 20 }}>
                {prefill.alumno.actividades.map((item, index) => (
                  <li key={index} style={{ fontSize: '0.85rem' }}>{item}</li>
                ))}
                {prefill.alumno.actividades.length === 0 && <li>Sin actividades registradas</li>}
              </ol>
            </section>

            <section className="card card-pad" style={{ marginTop: 14 }}>
              <div className="form-card-head"><h2>Empresa</h2></div>
              <div className="form-row">
                <FormField label="Giro" required error={errors.giro?.message}>
                  <TextInput {...register('giro')} placeholder="Ej. Servicios" disabled={isSubmitting} />
                </FormField>
                <FormField label="Tipo" required error={errors.tipoOrganizacion?.message}>
                  <Select {...register('tipoOrganizacion')} disabled={isSubmitting}>
                    <option value="Privada">Privada</option>
                    <option value="Pública">Pública</option>
                  </Select>
                </FormField>
                <FormField label="Tamaño" required error={errors.tamano?.message}>
                  <Select {...register('tamano')} disabled={isSubmitting}>
                    <option value="Pequeña">Pequeña</option>
                    <option value="Mediana">Mediana</option>
                    <option value="Grande">Grande</option>
                  </Select>
                </FormField>
              </div>
            </section>

            <section className="card card-pad" style={{ marginTop: 14 }}>
              <div className="form-card-head"><h2>Fechas y horario</h2></div>
              <div className="form-row">
                <FormField label="Fecha de inicio" required error={errors.fechaInicio?.message}>
                  <TextInput type="date" {...register('fechaInicio')} disabled={isSubmitting} />
                </FormField>
                <FormField label="Días" required error={errors.dias?.message}>
                  <TextInput {...register('dias')} placeholder="Ej. lunes a viernes" disabled={isSubmitting} />
                </FormField>
                <FormField label="Horario de entrada" required error={errors.horarioInicio?.message}>
                  <TextInput type="time" {...register('horarioInicio')} disabled={isSubmitting} />
                </FormField>
                <FormField label="Horario de salida" required error={errors.horarioFin?.message}>
                  <TextInput type="time" {...register('horarioFin')} disabled={isSubmitting} />
                </FormField>
              </div>
            </section>

            <section className="card card-pad" style={{ marginTop: 14 }}>
              <div className="form-card-head"><h2>Autorización</h2></div>
              <FormField label="Directivo que autoriza" required error={errors.directivo?.message}>
                <TextInput {...register('directivo')} placeholder="Ej. Lic. Roberto Martínez" disabled={isSubmitting} />
              </FormField>
            </section>

            {mensaje && (
              <div className="error" style={{ marginTop: 14 }}>
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                <span>{mensaje}</span>
              </div>
            )}

            <div className="field no-print" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
                    Guardar información
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {estado === 'guardada' && (
          <div className="card card-pad" style={{ marginTop: 14 }}>
            <div className="alert alert-ok">
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              <span>
                <strong style={{ display: 'block' }}>Información guardada</strong>
                Folio {folio ?? prefill?.folio ?? ''}. El enlace quedó desactivado. Puedes imprimir
                esta confirmación para tu expediente físico.
              </span>
            </div>
            <div className="field no-print" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-dark" onClick={() => window.print()}>
                <i className="fa-solid fa-print" aria-hidden="true" />
                Imprimir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
