import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import Alerta from '../../components/Alerta'
import DatoCampo from '../../components/DatoCampo'
import EstadoBadge from '../../components/EstadoBadge'
import PageHeader from '../../components/PageHeader'
import { DOCUMENTOS, etiquetaDocumento, ordenDocumento } from '../../lib/documentos'
import { cartaCompletadaPorEmpresa, correoSupervisorDeCarta } from '../../lib/empresa'
import { invitarEmpresa } from '../../lib/empresaApi'
import { formatearFechaCorta, normalizar } from '../../lib/formato'
import {
  cambiarEstadoProceso,
  listarProcesos,
  type EstadoProceso,
  type ProcesoConDocumentos,
} from '../../lib/procesos'
import type { DatosDocumentoGuardados } from '../../lib/schemas/documento'

type FiltroEstado = EstadoProceso | 'todas'

const FILTROS: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todos' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'aceptada', etiqueta: 'Aceptados' },
  { valor: 'rechazada', etiqueta: 'Rechazados' },
]

function claveCarrera(proceso: ProcesoConDocumentos): string {
  return proceso.personas?.carreras ? String(proceso.personas.carreras.id) : 'sin-carrera'
}

function SeccionesDatos({ datos }: { datos: Partial<DatosDocumentoGuardados> }) {
  const actividades = datos.actividades ?? []

  return (
    <div className="space-y-5">
      <div>
        <p className="seccion">Empresa</p>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DatoCampo label="Empresa" valor={datos.empresa} />
          <DatoCampo label="Lugar" valor={datos.lugar} />
          <DatoCampo label="Giro" valor={datos.giro} />
          <DatoCampo label="Tipo de organización" valor={datos.tipoOrganizacion} />
          <DatoCampo label="Tamaño" valor={datos.tamano} />
        </div>
      </div>

      <div>
        <p className="seccion">Fechas y horario</p>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DatoCampo
            label="Fecha de inicio"
            valor={datos.fechaInicio ? formatearFechaCorta(datos.fechaInicio) : null}
          />
          <DatoCampo label="Días" valor={datos.dias} />
          <DatoCampo label="Horario" valor={`${datos.horarioInicio ?? '—'} a ${datos.horarioFin ?? '—'}`} />
        </div>
      </div>

      <div>
        <p className="seccion">Supervisión y autorización</p>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DatoCampo label="Supervisor" valor={datos.supervisor} />
          <DatoCampo label="Puesto del supervisor" valor={datos.puestoSupervisor} />
          <DatoCampo label="Directivo que autoriza" valor={datos.directivo} />
        </div>
      </div>

      <div>
        <p className="seccion">Actividades</p>
        {actividades.length > 0 ? (
          <ol className="lista">
            {actividades.map((actividad, index) => (
              <li key={index}>{actividad}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink/40">Sin actividades registradas</p>
        )}
      </div>
    </div>
  )
}

export default function SolicitudesPage() {
  const queryClient = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas')
  const [filtroCarrera, setFiltroCarrera] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [seleccionada, setSeleccionada] = useState<ProcesoConDocumentos | null>(null)
  const [accionPendiente, setAccionPendiente] = useState<number | null>(null)
  const [invitePendiente, setInvitePendiente] = useState(false)
  const [avisoEmpresa, setAvisoEmpresa] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const { data: procesos, isLoading, error, refetch } = useQuery({
    queryKey: ['procesos'],
    queryFn: listarProcesos,
  })

  const carreras = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const proceso of procesos ?? []) {
      const carrera = proceso.personas?.carreras
      const clave = carrera ? String(carrera.id) : 'sin-carrera'
      if (!mapa.has(clave)) mapa.set(clave, carrera ? carrera.nombre : 'Sin carrera')
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [procesos])

  const porCarrera = useMemo(() => {
    if (filtroCarrera === 'todas') return procesos ?? []
    return (procesos ?? []).filter((proceso) => claveCarrera(proceso) === filtroCarrera)
  }, [procesos, filtroCarrera])

  const porBusqueda = useMemo(() => {
    const consulta = normalizar(busqueda.trim())
    if (!consulta) return porCarrera
    return porCarrera.filter((proceso) => {
      const nombre = normalizar(proceso.personas?.nombre ?? '')
      const correo = normalizar(proceso.personas?.correo ?? '')
      const id = normalizar(proceso.alumno_id)
      const folio = normalizar(proceso.folio)
      const documentos = proceso.solicitudes.some(
        (solicitud) =>
          normalizar(etiquetaDocumento(solicitud.documento)).includes(consulta) ||
          normalizar(solicitud.documento).includes(consulta),
      )
      return nombre.includes(consulta) || correo.includes(consulta) || id.includes(consulta) || folio.includes(consulta) || documentos
    })
  }, [porCarrera, busqueda])

  const conteos = useMemo(
    () => ({
      todas: porBusqueda.length,
      pendiente: porBusqueda.filter((p) => p.estado === 'pendiente').length,
      aceptada: porBusqueda.filter((p) => p.estado === 'aceptada').length,
      rechazada: porBusqueda.filter((p) => p.estado === 'rechazada').length,
    }),
    [porBusqueda],
  )

  const filtradas = useMemo(() => {
    if (filtroEstado === 'todas') return porBusqueda
    return porBusqueda.filter((proceso) => proceso.estado === filtroEstado)
  }, [porBusqueda, filtroEstado])

  async function manejarAccion(proceso: ProcesoConDocumentos, nuevoEstado: EstadoProceso) {
    setAccionPendiente(proceso.id)
    setErrorAccion(null)
    try {
      await cambiarEstadoProceso(proceso.id, nuevoEstado)
      await queryClient.invalidateQueries({ queryKey: ['procesos'] })
      setSeleccionada(null)
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo actualizar el proceso')
    } finally {
      setAccionPendiente(null)
    }
  }

  async function manejarInvitacion(proceso: ProcesoConDocumentos, reenviar: boolean) {
    setInvitePendiente(true)
    setErrorAccion(null)
    setAvisoEmpresa(null)
    try {
      const expira = await invitarEmpresa(proceso.id, reenviar)
      setAvisoEmpresa(
        `Enlace ${reenviar ? 'reenviado' : 'enviado'} a la empresa. Vence el ${formatearFechaCorta(expira)}.`,
      )
      await queryClient.invalidateQueries({ queryKey: ['procesos'] })
      const frescos = queryClient.getQueryData<ProcesoConDocumentos[]>(['procesos'])
      const actualizado = frescos?.find((item) => item.id === proceso.id)
      if (actualizado) setSeleccionada(actualizado)
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo enviar el enlace a la empresa')
    } finally {
      setInvitePendiente(false)
    }
  }

  if (seleccionada) {
    const carrera = seleccionada.personas?.carreras
    const resuelta = seleccionada.estado !== 'pendiente'
    const documentos = [...seleccionada.solicitudes].sort(
      (a, b) => ordenDocumento(a.documento) - ordenDocumento(b.documento),
    )
    const completos = documentos.length >= DOCUMENTOS.length
    const carta = documentos.find((solicitud) => solicitud.documento === 'carta_aceptacion')
    const cartaLista = carta ? cartaCompletadaPorEmpresa(carta.datos) : false
    const correoEmpresa = carta ? correoSupervisorDeCarta(carta.datos) : null
    const puedeAceptar = completos && cartaLista
    const empresaExpirada =
      !cartaLista &&
      Boolean(seleccionada.empresa_expira_en) &&
      Number.isFinite(Date.parse(String(seleccionada.empresa_expira_en))) &&
      Date.parse(String(seleccionada.empresa_expira_en)) <= Date.now()
    const estadoEmpresa = cartaLista
      ? 'Completada'
      : empresaExpirada
        ? 'Expirada'
        : seleccionada.empresa_estado === 'enviada'
          ? 'Enviada'
          : 'Sin enviar'
    const faltantes = DOCUMENTOS.filter(
      (doc) => !documentos.some((solicitud) => solicitud.documento === doc.codigo),
    )

    return (
      <div>
        <div className="mb-4">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSeleccionada(null)
              setErrorAccion(null)
              setAvisoEmpresa(null)
            }}
          >
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Volver a la lista
          </button>
        </div>

        <PageHeader
          icono="fa-solid fa-user-graduate"
          titulo="Proceso de prácticas"
          eyebrow={`Periodo ${seleccionada.periodo} · abierto el ${formatearFechaCorta(seleccionada.creado_en)}`}
          meta={
            <>
              <span className="etiqueta">
                <i className="fa-solid fa-hashtag" aria-hidden="true" />
                <span className="font-mono">{seleccionada.folio}</span>
              </span>
              <EstadoBadge estado={seleccionada.estado} />
            </>
          }
        />

        <div className="space-y-4">
          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2.5 border-b border-line pb-3.5">
              <i className="fa-solid fa-id-card text-base text-brand" aria-hidden="true" />
              <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink">
                Alumno
              </h2>
            </div>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <DatoCampo label="Nombre" valor={seleccionada.personas?.nombre} />
              <DatoCampo label="ID" valor={seleccionada.alumno_id} />
              <DatoCampo label="Carrera" valor={carrera ? carrera.nombre : null} />
              <DatoCampo label="Correo" valor={seleccionada.personas?.correo} />
            </div>
          </section>

          {documentos.map((solicitud) => (
            <section key={solicitud.id} className="card p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-line pb-3.5">
                <i className="fa-solid fa-file-lines text-base text-brand" aria-hidden="true" />
                <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink">
                  {etiquetaDocumento(solicitud.documento)}
                </h2>
                <span className="ml-auto text-xs font-semibold text-ink/40">
                  Enviada el {formatearFechaCorta(solicitud.creado_en)}
                </span>
              </div>
              <SeccionesDatos datos={solicitud.datos as Partial<DatosDocumentoGuardados>} />
            </section>
          ))}

          {faltantes.length > 0 && (
            <Alerta icono="fa-solid fa-triangle-exclamation" tono="warn">
              Faltan {faltantes.length} documento(s): {faltantes.map((doc) => doc.titulo).join(', ')}.
              El alumno puede seguir agregándolos.
            </Alerta>
          )}

          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-line pb-3.5">
              <i className="fa-solid fa-building text-base text-brand" aria-hidden="true" />
              <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink">Empresa</h2>
              <span className="ml-auto text-xs font-semibold text-ink/40">{estadoEmpresa}</span>
            </div>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <DatoCampo
                label="Correo del supervisor"
                valor={correoEmpresa ?? seleccionada.empresa_correo}
              />
              <DatoCampo
                label="Vence el enlace"
                valor={
                  seleccionada.empresa_expira_en
                    ? formatearFechaCorta(seleccionada.empresa_expira_en)
                    : null
                }
              />
              <DatoCampo
                label="Completada"
                valor={
                  seleccionada.empresa_completada_en
                    ? formatearFechaCorta(seleccionada.empresa_completada_en)
                    : null
                }
              />
            </div>

            {!resuelta && carta && !cartaLista && (
              <>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void manejarInvitacion(seleccionada, false)}
                    disabled={invitePendiente || !correoEmpresa}
                  >
                    {invitePendiente ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Enviando…
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                        Confirmar y enviar a empresa
                      </>
                    )}
                  </button>
                  {seleccionada.empresa_estado === 'enviada' && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => void manejarInvitacion(seleccionada, true)}
                      disabled={invitePendiente || !correoEmpresa}
                    >
                      <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                      Reenviar enlace
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink/45">
                  La confirmación solo envía el enlace temporal a la empresa; no acepta el proceso.
                </p>
              </>
            )}

            {avisoEmpresa && (
              <Alerta icono="fa-solid fa-circle-check" tono="ok" className="mt-4">
                {avisoEmpresa}
              </Alerta>
            )}
          </section>

          {!resuelta && (
            <section className="card p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2.5 border-b border-line pb-3.5">
                <i className="fa-solid fa-gavel text-base text-brand" aria-hidden="true" />
                <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink">
                  Acciones
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-ink/55">
                Al aceptar o rechazar, el resultado se aplica a los {DOCUMENTOS.length} documentos del
                alumno en este periodo.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-ok"
                  onClick={() => void manejarAccion(seleccionada, 'aceptada')}
                  disabled={accionPendiente !== null || !puedeAceptar}
                >
                  {accionPendiente === seleccionada.id ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Procesando…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check" aria-hidden="true" />
                      Aceptar proceso
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => void manejarAccion(seleccionada, 'rechazada')}
                  disabled={accionPendiente !== null}
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                  Rechazar proceso
                </button>
              </div>
              {!puedeAceptar && (
                <Alerta
                  icono="fa-solid fa-circle-info"
                  tono="warn"
                  className="mt-4"
                >
                  Para aceptar se requieren los {DOCUMENTOS.length} documentos y la carta completada
                  por la empresa. Faltan {DOCUMENTOS.length - documentos.length} documento(s)
                  {!cartaLista ? ' y la carta de la empresa' : ''}.
                </Alerta>
              )}
              {errorAccion && (
                <Alerta icono="fa-solid fa-circle-exclamation" tono="danger" className="mt-4">
                  {errorAccion}
                </Alerta>
              )}
            </section>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        icono="fa-solid fa-clipboard-list"
        titulo="Procesos de prácticas"
        eyebrow="Panel del coordinador"
        meta={<span className="etiqueta">{procesos?.length ?? 0} procesos</span>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1.6fr_0.8fr]">
        <div className="relative">
          <i
            className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink/30"
            aria-hidden="true"
          />
          <input
            type="search"
            className="campo pl-9"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre, correo, ID, folio o documento…"
            aria-label="Buscar alumno"
          />
        </div>
        <select
          className="campo"
          value={filtroCarrera}
          onChange={(evento) => setFiltroCarrera(evento.target.value)}
          aria-label="Filtrar por carrera"
        >
          <option value="todas">Todas las carreras</option>
          {carreras.map(([clave, nombre]) => (
            <option key={clave} value={clave}>
              {nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((filtro) => {
          const activo = filtroEstado === filtro.valor
          return (
            <button
              key={filtro.valor}
              type="button"
              onClick={() => setFiltroEstado(filtro.valor)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold tracking-[0.04em] uppercase transition ${
                activo
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink/55 ring-1 ring-line hover:text-ink'
              }`}
            >
              {filtro.etiqueta}{' '}
              <span className={activo ? 'text-white/55' : 'text-ink/30'}>
                ({conteos[filtro.valor]})
              </span>
            </button>
          )
        })}
      </div>

      {isLoading && (
        <Alerta icono="fa-solid fa-spinner fa-spin" tono="info">
          Cargando procesos…
        </Alerta>
      )}

      {error && (
        <div className="card p-5">
          <Alerta icono="fa-solid fa-circle-exclamation" tono="danger">
            No se pudieron cargar los procesos.
          </Alerta>
          <button type="button" className="btn btn-outline mt-4" onClick={() => void refetch()}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && (procesos ?? []).length === 0 && (
        <div className="card">
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <i className="fa-solid fa-inbox text-3xl text-ink/20" aria-hidden="true" />
            <strong className="text-sm font-bold text-ink">Todavía no se han abierto procesos</strong>
            <span className="text-sm text-ink/45">
              Cuando un alumno solicite su carta de aceptación aparecerá aquí.
            </span>
          </div>
        </div>
      )}

      {!isLoading && !error && (procesos ?? []).length > 0 && filtradas.length === 0 && (
        <div className="card">
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <i
              className="fa-solid fa-magnifying-glass text-3xl text-ink/20"
              aria-hidden="true"
            />
            <strong className="text-sm font-bold text-ink">Sin resultados</strong>
            <span className="text-sm text-ink/45">
              No hay procesos que coincidan con los filtros seleccionados.
            </span>
          </div>
        </div>
      )}

      {!isLoading && !error && filtradas.length > 0 && (
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Alumno</th>
                <th>Carrera</th>
                <th>Documentos</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((proceso) => {
                const carrera = proceso.personas?.carreras
                return (
                  <tr key={proceso.id}>
                    <td data-label="Folio">
                      <span className="font-mono text-xs font-bold text-ink">
                        {proceso.folio}
                      </span>
                    </td>
                    <td data-label="Alumno">
                      <span className="block font-semibold text-ink">
                        {proceso.personas?.nombre ?? '—'}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/45">
                        ID {proceso.alumno_id}
                        {proceso.personas?.correo ? ` · ${proceso.personas.correo}` : ''}
                      </span>
                    </td>
                    <td data-label="Carrera" className="font-medium">
                      {carrera ? carrera.sigla || carrera.nombre : '—'}
                    </td>
                    <td data-label="Documentos" className="font-semibold tabular-nums">
                      {proceso.solicitudes.length}/{DOCUMENTOS.length}
                    </td>
                    <td data-label="Fecha" className="text-xs text-ink/50 tabular-nums">
                      {formatearFechaCorta(proceso.creado_en)}
                    </td>
                    <td data-label="Estado">
                      <EstadoBadge estado={proceso.estado} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setSeleccionada(proceso)
                          setErrorAccion(null)
                          setAvisoEmpresa(null)
                        }}
                      >
                        <i className="fa-solid fa-eye" aria-hidden="true" />
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}