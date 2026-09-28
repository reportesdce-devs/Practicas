import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { DOCUMENTOS, etiquetaDocumento, ordenDocumento } from '../../lib/documentos'
import {
  cambiarEstadoProceso,
  listarProcesos,
  type EstadoProceso,
  type ProcesoConDocumentos,
} from '../../lib/procesos'
import type { DatosDocumentoGuardados } from '../../lib/schemas/documento'

type FiltroEstado = EstadoProceso | 'todas'

const ESTILOS_ESTADO: Record<EstadoProceso, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  aceptada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
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
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{valor || '—'}</dd>
    </div>
  )
}

function BadgeEstado({ estado }: { estado: EstadoProceso }) {
  const etiqueta = estado.charAt(0).toUpperCase() + estado.slice(1)
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTILOS_ESTADO[estado]}`}
    >
      {etiqueta}
    </span>
  )
}

function SeccionesDatos({ datos }: { datos: Partial<DatosDocumentoGuardados> }) {
  return (
    <>
      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold">Empresa</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Dato label="Empresa" valor={datos.empresa} />
          <Dato label="Lugar" valor={datos.lugar} />
          <Dato label="Giro" valor={datos.giro} />
          <Dato label="Tipo de organización" valor={datos.tipoOrganizacion} />
          <Dato label="Tamaño" valor={datos.tamano} />
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold">Fechas y horario</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Dato
            label="Fecha de inicio"
            valor={datos.fechaInicio ? formatearFecha(datos.fechaInicio) : null}
          />
          <Dato label="Días" valor={datos.dias} />
          <Dato label="Horario" valor={`${datos.horarioInicio ?? '—'} a ${datos.horarioFin ?? '—'}`} />
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold">Supervisión y autorización</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Dato label="Supervisor" valor={datos.supervisor} />
          <Dato label="Puesto del supervisor" valor={datos.puestoSupervisor} />
          <Dato label="Directivo que autoriza" valor={datos.directivo} />
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold">Actividades</h3>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
          {(datos.actividades ?? []).map((actividad, index) => (
            <li key={index}>{actividad}</li>
          ))}
          {(datos.actividades ?? []).length === 0 && (
            <li className="list-none pl-0 text-gray-400">Sin actividades registradas</li>
          )}
        </ol>
      </section>
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

  if (seleccionada) {
    const carrera = seleccionada.personas?.carreras
    const resuelta = seleccionada.estado !== 'pendiente'
    const documentos = [...seleccionada.solicitudes].sort(
      (a, b) => ordenDocumento(a.documento) - ordenDocumento(b.documento),
    )
    const completos = documentos.length >= DOCUMENTOS.length
    const faltantes = DOCUMENTOS.filter(
      (doc) => !documentos.some((solicitud) => solicitud.documento === doc.codigo),
    )

    return (
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => {
            setSeleccionada(null)
            setErrorAccion(null)
          }}
          className="text-sm font-semibold text-brand-dark"
        >
          ← Volver a la lista
        </button>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Proceso de prácticas</h1>
          <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 font-mono text-sm font-bold text-slate-800">
            {seleccionada.folio}
          </span>
          <BadgeEstado estado={seleccionada.estado} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Periodo {seleccionada.periodo} · abierto el {formatearFecha(seleccionada.creado_en)}
        </p>

        <section className="mt-5 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Alumno</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Dato label="Nombre" valor={seleccionada.personas?.nombre} />
            <Dato label="ID" valor={seleccionada.alumno_id} />
            <Dato label="Carrera" valor={carrera ? carrera.nombre : '—'} />
            <Dato label="Correo" valor={seleccionada.personas?.correo} />
          </dl>
        </section>

        {documentos.map((solicitud) => (
          <div key={solicitud.id} className="mt-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold">{etiquetaDocumento(solicitud.documento)}</h2>
              <span className="text-sm text-gray-500">
                enviada el {formatearFecha(solicitud.creado_en)}
              </span>
            </div>
            <SeccionesDatos datos={solicitud.datos as Partial<DatosDocumentoGuardados>} />
          </div>
        ))}

        {faltantes.length > 0 && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Faltan {faltantes.length} documento(s): {faltantes.map((doc) => doc.titulo).join(', ')}.
            El alumno puede seguir agregándolos.
          </p>
        )}

        {!resuelta && (
          <section className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-semibold">Acciones</h2>
            <p className="mt-1 text-xs text-gray-500">
              Al aceptar o rechazar, el resultado se aplica a los {DOCUMENTOS.length} documentos del
              alumno en este periodo.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void manejarAccion(seleccionada, 'aceptada')}
                disabled={accionPendiente !== null || !completos}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {accionPendiente === seleccionada.id ? 'Procesando…' : 'Aceptar proceso'}
              </button>
              <button
                type="button"
                onClick={() => void manejarAccion(seleccionada, 'rechazada')}
                disabled={accionPendiente !== null}
                className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                Rechazar proceso
              </button>
            </div>
            {!completos && (
              <p className="mt-3 text-xs font-semibold text-amber-700">
                Para aceptar se requieren los {DOCUMENTOS.length} documentos. Faltan{' '}
                {DOCUMENTOS.length - documentos.length}.
              </p>
            )}
            {errorAccion && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {errorAccion}
              </p>
            )}
          </section>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
        Panel del coordinador
      </p>
      <h1 className="mt-1 text-2xl font-bold">Procesos de prácticas</h1>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((filtro) => {
            const activo = filtroEstado === filtro.valor
            return (
              <button
                key={filtro.valor}
                type="button"
                onClick={() => setFiltroEstado(filtro.valor)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  activo
                    ? 'border-brand bg-brand text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {filtro.etiqueta} ({conteos[filtro.valor]})
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre, correo, ID, folio o documento…"
            aria-label="Buscar alumno"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <select
            value={filtroCarrera}
            onChange={(evento) => setFiltroCarrera(evento.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="todas">Todas las carreras</option>
            {carreras.map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <p className="mt-8 flex items-center gap-3 text-sm text-gray-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
          Cargando procesos…
        </p>
      )}

      {error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-red-700">No se pudieron cargar los procesos.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && (procesos ?? []).length === 0 && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400 shadow-sm">
          Todavía no se han abierto procesos de prácticas.
        </div>
      )}

      {!isLoading && !error && (procesos ?? []).length > 0 && filtradas.length === 0 && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400 shadow-sm">
          No hay procesos que coincidan con los filtros seleccionados.
        </div>
      )}

      {!isLoading && !error && filtradas.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-bold">Folio</th>
                <th className="px-4 py-3 font-bold">Alumno</th>
                <th className="px-4 py-3 font-bold">Carrera</th>
                <th className="px-4 py-3 font-bold">Documentos</th>
                <th className="px-4 py-3 font-bold">Fecha</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((proceso) => {
                const carrera = proceso.personas?.carreras
                return (
                  <tr key={proceso.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                      {proceso.folio}
                    </td>
                    <td className="px-4 py-3">
                      <strong className="block font-semibold text-slate-900">
                        {proceso.personas?.nombre ?? '—'}
                      </strong>
                      <span className="text-xs text-gray-500">
                        ID {proceso.alumno_id}
                        {proceso.personas?.correo ? ` · ${proceso.personas.correo}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {carrera ? carrera.sigla || carrera.nombre : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {proceso.solicitudes.length}/{DOCUMENTOS.length}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatearFecha(proceso.creado_en)}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeEstado estado={proceso.estado} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSeleccionada(proceso)
                          setErrorAccion(null)
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                      >
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
