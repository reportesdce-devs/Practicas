import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import Alerta from '../../components/Alerta'
import DatoCampo from '../../components/DatoCampo'
import FormField from '../../components/form/FormField'
import { Select, TextInput } from '../../components/form/inputs'
import PantallaEstado from '../../components/PantallaEstado'
import {
  guardarComplementoEmpresa,
  obtenerPrefillEmpresa,
  type PrefillEmpresa,
} from '../../lib/empresaApi'
import { formatearFecha } from '../../lib/formato'
import {
  complementoEmpresaSchema,
  type ComplementoEmpresa,
} from '../../lib/schemas/documento'

type Estado = 'cargando' | 'lista' | 'guardada' | 'error'

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-5 border-b border-line pb-3.5 text-[0.8rem] font-bold tracking-[0.08em] text-ink uppercase">
        {titulo}
      </h2>
      {children}
    </section>
  )
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
    <div className="min-h-dvh bg-white px-5 py-10 print:bg-white print:p-0 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex justify-center print:hidden">
          <img src="/logo-dce.png" alt="ISND" className="h-9 w-auto" />
        </div>

        <div className="text-center">
          <i className="fa-solid fa-building text-2xl text-brand" aria-hidden="true" />
          <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand">
            Prácticas profesionales
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink">
            Completa los datos de la empresa
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/55">
            Revisa la información registrada por el alumno y completa los datos faltantes. Al guardar,
            el enlace se desactiva.
          </p>

          {prefill && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="etiqueta">
                <i className="fa-solid fa-hashtag" aria-hidden="true" />
                <span className="font-mono">{prefill.folio}</span>
              </span>
              <span className="etiqueta">Vence {formatearFecha(prefill.expira_en)}</span>
            </div>
          )}
        </div>

        {estado === 'cargando' && (
          <p className="mt-10 flex items-center justify-center gap-3 text-sm text-ink/50">
            <span className="spinner text-brand" aria-hidden="true" />
            Validando el enlace…
          </p>
        )}

        {estado === 'error' && (
          <div className="mt-10 flex justify-center">
            <PantallaEstado
              icono="fa-solid fa-link-slash"
              tono="danger"
              titulo="Enlace no disponible"
              descripcion={mensaje ?? 'Enlace inválido o vencido.'}
            />
          </div>
        )}

        {estado === 'lista' && prefill && (
          <form onSubmit={onSubmit} className="mt-10 space-y-4">
            <Seccion titulo="Información del alumno (solo lectura)">
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <DatoCampo label="Empresa" valor={prefill.alumno.empresa} />
                <DatoCampo label="Lugar" valor={prefill.alumno.lugar} />
                <DatoCampo label="Supervisor" valor={prefill.alumno.supervisor} />
                <DatoCampo label="Puesto" valor={prefill.alumno.puestoSupervisor} />
              </div>
              <p className="seccion mt-6">Actividades</p>
              {prefill.alumno.actividades.length > 0 ? (
                <ol className="lista">
                  {prefill.alumno.actividades.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink/40">Sin actividades registradas</p>
              )}
            </Seccion>

            <Seccion titulo="Empresa">
              <div className="grid gap-4 sm:grid-cols-2">
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
            </Seccion>

            <Seccion titulo="Fechas y horario">
              <div className="grid gap-4 sm:grid-cols-2">
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
            </Seccion>

            <Seccion titulo="Autorización">
              <FormField label="Directivo que autoriza" required error={errors.directivo?.message}>
                <TextInput
                  {...register('directivo')}
                  placeholder="Ej. Lic. Roberto Martínez"
                  disabled={isSubmitting}
                />
              </FormField>
            </Seccion>

            {mensaje && (
              <Alerta icono="fa-solid fa-circle-exclamation" tono="danger">
                {mensaje}
              </Alerta>
            )}

            <div className="flex justify-end print:hidden">
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
          <div className="mt-10 space-y-4">
            <Alerta icono="fa-solid fa-circle-check" tono="ok" titulo="Información guardada">
              Folio {folio ?? prefill?.folio ?? ''}. El enlace quedó desactivado. Puedes imprimir esta
              confirmación para tu expediente físico.
            </Alerta>
            <div className="flex justify-end print:hidden">
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