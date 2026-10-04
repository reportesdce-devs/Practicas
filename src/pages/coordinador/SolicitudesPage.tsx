import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { DOCUMENTOS, etiquetaDocumento, ordenDocumento } from '../../lib/documentos'
import { cartaCompletadaPorEmpresa, correoSupervisorDeCarta } from '../../lib/empresa'
import { invitarEmpresa } from '../../lib/empresaApi'
import {
  cambiarEstadoProceso,
  listarProcesos,
  type EstadoProceso,
  type ProcesoConDocumentos,
} from '../../lib/procesos'
import type { DatosDocumentoGuardados } from '../../lib/schemas/documento'

type FiltroEstado = EstadoProceso | 'todas'

const ESTILOS_BADGE: Record<EstadoProceso, string> = {
  pendiente: 'b-pendiente',
  aceptada: 'b-atendido',
  rechazada: 'b-rechazada',
}

const ETIQUETAS_ESTADO: Record<EstadoProceso, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
}

const FILTROS: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todos' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'aceptada', etiqueta: 'Aceptados' },
  { valor: 'rechazada', etiqueta: 'Rechazados' },
]

function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function claveCarrera(proceso: ProcesoConDocumentos): string {
  return proceso.personas?.carreras ? String(proceso.personas.carreras.id) : 'sin-carrera'
}

function Dato({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div className="form-group">
      <span
        className="field-hint"
        style={{
          fontSize: '0.62rem',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{valor || '—'}</span>
    </div>
  )
}

function BadgeEstado({ estado }: { estado: EstadoProceso }) {
  return <span className={`badge ${ESTILOS_BADGE[estado]}`}>{ETIQUETAS_ESTADO[estado]}</span>
}

function SeccionesDatos({ datos }: { datos: Partial<DatosDocumentoGuardados> }) {
  return (
    <>
      <div className="form-section-label">Empresa</div>
      <div className="form-row">
        <Dato label="Empresa" valor={datos.empresa} />
        <Dato label="Lugar" valor={datos.lugar} />
        <Dato label="Giro" valor={datos.giro} />
        <Dato label="Tipo de organización" valor={datos.tipoOrganizacion} />
        <Dato label="Tamaño" valor={datos.tamano} />
      </div>

      <div className="form-section-label">Fechas y horario</div>
      <div className="form-row">
        <Dato
          label="Fecha de inicio"
          valor={datos.fechaInicio ? formatearFecha(datos.fechaInicio) : null}
        />
        <Dato label="Días" valor={datos.dias} />
        <Dato label="Horario" valor={`${datos.horarioInicio ?? '—'} a ${datos.horarioFin ?? '—'}`} />
      </div>

      <div className="form-section-label">Supervisión y autorización</div>
      <div className="form-row">
        <Dato label="Supervisor" valor={datos.supervisor} />
        <Dato label="Puesto del supervisor" valor={datos.puestoSupervisor} />
        <Dato label="Directivo que autoriza" valor={datos.directivo} />
      </div>

      <div className="form-section-label">Actividades</div>
      <ol className="form-group" style={{ marginTop: 6, paddingLeft: 20 }}>
        {(datos.actividades ?? []).map((actividad, index) => (
          <li key={index} style={{ fontSize: '0.85rem' }}>
            {actividad}
          </li>
        ))}
        {(datos.actividades ?? []).length === 0 && (
          <li style={{ color: 'var(--muted)' }}>Sin actividades registradas</li>
        )}
      </ol>
    </>
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

  const {
    data: procesos,
    isLoading,
    error,
    refetch,
  } = useQuery({
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
      return (
        nombre.includes(consulta) ||
        correo.includes(consulta) ||
        id.includes(consulta) ||
        folio.includes(consulta) ||
        documentos
      )
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
        `Enlace ${reenviar ? 'reenviado' : 'enviado'} a la empresa. Vence el ${formatearFecha(expira)}.`,
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
        <div className="top">
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
          <div className="head-meta">
            <span className="tag">
              <i className="fa-solid fa-hashtag" aria-hidden="true" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{seleccionada.folio}</span>
            </span>
            <BadgeEstado estado={seleccionada.estado} />
          </div>
        </div>

        <div className="head-row">
          <div className="head-icon">
            <i className="fa-solid fa-user-graduate" aria-hidden="true" />
          </div>
          <div className="head-text">
            <h1>Proceso de prácticas</h1>
            <span className="head-sub">
              Periodo {seleccionada.periodo} · abierto el {formatearFecha(seleccionada.creado_en)}
            </span>
          </div>
        </div>

        <section className="card card-pad" style={{ marginTop: 16 }}>
          <div className="form-card-head">
            <h2>Alumno</h2>
          </div>
          <div className="form-row">
            <Dato label="Nombre" valor={seleccionada.personas?.nombre} />
            <Dato label="ID" valor={seleccionada.alumno_id} />
            <Dato label="Carrera" valor={carrera ? carrera.nombre : '—'} />
            <Dato label="Correo" valor={seleccionada.personas?.correo} />
          </div>
        </section>

        {documentos.map((solicitud) => (
          <section key={solicitud.id} className="card card-pad" style={{ marginTop: 14 }}>
            <div className="form-card-head">
              <h2>{etiquetaDocumento(solicitud.documento)}</h2>
              <span className="meta-date">Enviada el {formatearFecha(solicitud.creado_en)}</span>
            </div>
            <SeccionesDatos datos={solicitud.datos as Partial<DatosDocumentoGuardados>} />
          </section>
        ))}

        {faltantes.length > 0 && (
          <div className="alert alert-warn" style={{ marginTop: 14 }}>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <span>
              Faltan {faltantes.length} documento(s): {faltantes.map((doc) => doc.titulo).join(', ')}.
              El alumno puede seguir agregándolos.
            </span>
          </div>
        )}

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <div className="form-card-head">
            <h2>Empresa</h2>
            <span className="meta-date">{estadoEmpresa}</span>
          </div>
          <div className="form-row">
            <Dato label="Correo del supervisor" valor={correoEmpresa ?? seleccionada.empresa_correo} />
            <Dato
              label="Vence el enlace"
              valor={seleccionada.empresa_expira_en ? formatearFecha(seleccionada.empresa_expira_en) : null}
            />
            <Dato
              label="Completada"
              valor={seleccionada.empresa_completada_en ? formatearFecha(seleccionada.empresa_completada_en) : null}
            />
          </div>
          {!resuelta && carta && !cartaLista && (
            <div className="field" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                  className="btn"
                  onClick={() => void manejarInvitacion(seleccionada, true)}
                  disabled={invitePendiente || !correoEmpresa}
                >
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                  Reenviar enlace
                </button>
              )}
            </div>
          )}
          {!resuelta && (
            <p className="quiet" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
              La confirmación solo envía el enlace temporal a la empresa; no acepta el proceso.
            </p>
          )}
          {avisoEmpresa && (
            <div className="alert alert-ok" style={{ marginTop: 12 }}>
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              <span>{avisoEmpresa}</span>
            </div>
          )}
        </section>

        {!resuelta && (
          <section className="card card-pad" style={{ marginTop: 14 }}>
            <div className="form-card-head">
              <h2>Acciones</h2>
            </div>
            <p className="quiet" style={{ fontSize: '0.82rem' }}>
              Al aceptar o rechazar, el resultado se aplica a los {DOCUMENTOS.length} documentos
              del alumno en este periodo.
            </p>
            <div className="field" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                className="btn btn-danger-solid"
                onClick={() => void manejarAccion(seleccionada, 'rechazada')}
                disabled={accionPendiente !== null}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
                Rechazar proceso
              </button>
            </div>
            {!puedeAceptar && (
              <div className="alert alert-warn" style={{ marginTop: 14 }}>
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <span>
                  Para aceptar se requieren los {DOCUMENTOS.length} documentos y la carta completada
                  por la empresa. Faltan {DOCUMENTOS.length - documentos.length} documento(s)
                  {!cartaLista ? ' y la carta de la empresa' : ''}.
                </span>
              </div>
            )}
            {errorAccion && (
              <div className="error">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                <span>{errorAccion}</span>
              </div>
            )}
          </section>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="top">
        <div className="head-row">
          <div className="head-icon">
            <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
          </div>
          <div className="head-text">
            <h1>Procesos de prácticas</h1>
            <span className="head-sub">Panel del coordinador</span>
          </div>
        </div>
        <div className="head-meta">
          <span className="meta-date">{procesos?.length ?? 0} procesos</span>
        </div>
      </div>

      <div className="filters">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, correo, ID, folio o documento…"
          aria-label="Buscar alumno"
        />
        <select value={filtroCarrera} onChange={(evento) => setFiltroCarrera(evento.target.value)}>
          <option value="todas">Todas las carreras</option>
          {carreras.map(([clave, nombre]) => (
            <option key={clave} value={clave}>
              {nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="seg-control" style={{ marginBottom: 16 }}>
        {FILTROS.map((filtro) => {
          const activo = filtroEstado === filtro.valor
          return (
            <button
              key={filtro.valor}
              type="button"
              className={`seg${activo ? ' active' : ''}`}
              onClick={() => setFiltroEstado(filtro.valor)}
            >
              {filtro.etiqueta} ({conteos[filtro.valor]})
            </button>
          )
        })}
      </div>

      {isLoading && (
        <div className="alert alert-info">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
          <span>Cargando procesos…</span>
        </div>
      )}

      {error && (
        <div className="card card-pad">
          <div className="error" style={{ marginBottom: 0 }}>
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>No se pudieron cargar los procesos.</span>
          </div>
          <button type="button" className="btn" onClick={() => void refetch()}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && (procesos ?? []).length === 0 && (
        <div className="card">
          <div className="empty-state">
            <i className="fa-solid fa-inbox" aria-hidden="true" />
            <strong>Todavía no se han abierto procesos</strong>
            <span>Cuando un alumno solicite su carta de aceptación aparecerá aquí.</span>
          </div>
        </div>
      )}

      {!isLoading && !error && (procesos ?? []).length > 0 && filtradas.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <strong>Sin resultados</strong>
            <span>No hay procesos que coincidan con los filtros seleccionados.</span>
          </div>
        </div>
      )}

      {!isLoading && !error && filtradas.length > 0 && (
        <div className="table-wrap">
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
                      <span className="td-folio">{proceso.folio}</span>
                    </td>
                    <td data-label="Alumno">
                      <span className="td-id">{proceso.personas?.nombre ?? '—'}</span>
                      <span className="td-fecha">
                        ID {proceso.alumno_id}
                        {proceso.personas?.correo ? ` · ${proceso.personas.correo}` : ''}
                      </span>
                    </td>
                    <td data-label="Carrera">
                      {carrera ? carrera.sigla || carrera.nombre : '—'}
                    </td>
                    <td data-label="Documentos">
                      {proceso.solicitudes.length}/{DOCUMENTOS.length}
                    </td>
                    <td data-label="Fecha">
                      <span className="td-fecha">{formatearFecha(proceso.creado_en)}</span>
                    </td>
                    <td data-label="Estado">
                      <BadgeEstado estado={proceso.estado} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="row-btn row-edit"
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