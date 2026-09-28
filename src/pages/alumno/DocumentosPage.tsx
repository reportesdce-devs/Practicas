import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DOCUMENTOS } from '../../lib/documentos'
import {
  buscarProcesoConDocumentos,
  type EstadoProceso,
  type ProcesoConDocumentos,
} from '../../lib/procesos'

const CARTA_HREF = '/alumno/solicitud/carta-aceptacion'

const ESTILOS_ESTADO: Record<EstadoProceso, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  aceptada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

const TEXTOS_ESTADO: Record<EstadoProceso, string> = {
  pendiente: 'En espera de la respuesta del coordinador.',
  aceptada: 'La coordinación aprobó tu proceso de prácticas.',
  rechazada: 'La coordinación rechazó tu proceso de prácticas.',
}

interface Tarjeta {
  badge: EstadoProceso | null
  texto: string
  accion: string
  href: string
}

function evaluarTarjeta(
  proceso: ProcesoConDocumentos | null | undefined,
  doc: (typeof DOCUMENTOS)[number],
): Tarjeta {
  const esCarta = doc.codigo === 'carta_aceptacion'

  if (!proceso) {
    return esCarta
      ? { badge: null, texto: doc.descripcion, accion: 'Solicitar →', href: doc.href }
      : {
          badge: null,
          texto: 'Primero solicita la carta de aceptación para abrir un proceso.',
          accion: 'Ir a la carta →',
          href: CARTA_HREF,
        }
  }

  const solicitud = proceso.solicitudes.find((s) => s.documento === doc.codigo)

  if (proceso.estado === 'rechazada') {
    if (esCarta) {
      return {
        badge: 'rechazada',
        texto: 'Rechazada. Puedes solicitarla de nuevo abriendo un proceso nuevo.',
        accion: 'Solicitar de nuevo →',
        href: doc.href,
      }
    }
    return {
      badge: 'rechazada',
      texto: 'El proceso fue rechazado. Primero solicita la carta de aceptación para abrir uno nuevo.',
      accion: 'Ir a la carta →',
      href: CARTA_HREF,
    }
  }

  if (proceso.estado === 'aceptada') {
    return {
      badge: 'aceptada',
      texto: solicitud ? TEXTOS_ESTADO.aceptada : 'Tu proceso ya fue aceptado.',
      accion: solicitud ? 'Ver solicitud →' : '',
      href: doc.href,
    }
  }

  if (solicitud) {
    return { badge: 'pendiente', texto: TEXTOS_ESTADO.pendiente, accion: 'Ver solicitud →', href: doc.href }
  }

  return { badge: null, texto: doc.descripcion, accion: 'Solicitar →', href: doc.href }
}

function BadgeEstado({ estado }: { estado: EstadoProceso }) {
  const etiqueta = estado.charAt(0).toUpperCase() + estado.slice(1)
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTILOS_ESTADO[estado]}`}
    >
      {etiqueta}
    </span>
  )
}

export default function DocumentosPage() {
  const { profile } = useAuth()
  const alumnoId = profile?.id

  const { data: proceso } = useQuery({
    queryKey: ['proceso-periodo', alumnoId ?? ''],
    queryFn: async () => (alumnoId ? buscarProcesoConDocumentos(alumnoId) : null),
    enabled: Boolean(alumnoId),
  })

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
        Portal del alumno
      </p>
      <h1 className="mt-1 text-2xl font-bold">Consulta de documentos para prácticas</h1>
      <p className="mt-2 text-sm text-gray-500">
        Cada proceso agrupa tus 3 documentos: carta de aceptación, avance y cierre.
      </p>

      {proceso && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="font-semibold text-slate-900">
            Proceso <span className="font-mono">{proceso.folio}</span>
          </span>
          <span className="text-gray-500">
            {proceso.solicitudes.length} de {DOCUMENTOS.length} documentos
          </span>
          <BadgeEstado estado={proceso.estado} />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENTOS.map((doc) => {
          const tarjeta = evaluarTarjeta(proceso, doc)
          return (
            <Link
              key={doc.codigo}
              to={tarjeta.href}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{doc.titulo}</h2>
                {tarjeta.badge && <BadgeEstado estado={tarjeta.badge} />}
              </div>
              <p className="mt-2 text-sm text-gray-500">{tarjeta.texto}</p>
              <span className="mt-4 inline-block text-sm font-bold text-brand-dark">
                {tarjeta.accion || 'Ver detalle →'}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
