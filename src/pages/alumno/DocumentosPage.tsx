import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Alerta from '../../components/Alerta'
import EstadoBadge from '../../components/EstadoBadge'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { DOCUMENTOS, type CodigoDocumento } from '../../lib/documentos'
import { cartaCompletadaPorEmpresa } from '../../lib/empresa'
import { buscarProcesoConDocumentos, type ProcesoConDocumentos } from '../../lib/procesos'

const CARTA_HREF = '/alumno/solicitud/carta-aceptacion'

const ICONOS_DOCUMENTO: Record<CodigoDocumento, string> = {
  carta_aceptacion: 'fa-solid fa-envelope',
  avance: 'fa-solid fa-clipboard-list',
  cierre: 'fa-solid fa-flag-checkered',
}

const BADGE_RECHAZADA = {
  clase: 'bg-danger-soft text-danger',
  etiqueta: 'Rechazada',
}
const BADGE_ATENDIDA = { clase: 'bg-ok-soft text-ok', etiqueta: 'Aceptada' }
const BADGE_PENDIENTE = { clase: 'bg-warn-soft text-warn', etiqueta: 'En revisión' }

interface Tarjeta {
  badge: { clase: string; etiqueta: string } | null
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
      ? { badge: null, texto: doc.descripcion, accion: 'Solicitar', href: doc.href }
      : {
          badge: null,
          texto: 'Primero solicita la carta de aceptación para abrir un proceso.',
          accion: 'Ir a la carta',
          href: CARTA_HREF,
        }
  }

  const solicitud = proceso.solicitudes.find((s) => s.documento === doc.codigo)
  const carta = proceso.solicitudes.find((s) => s.documento === 'carta_aceptacion')
  const cartaLista = cartaCompletadaPorEmpresa(carta?.datos)

  if (proceso.estado === 'rechazada') {
    if (esCarta) {
      return {
        badge: BADGE_RECHAZADA,
        texto: 'Puedes solicitarla de nuevo abriendo un proceso nuevo.',
        accion: 'Solicitar de nuevo',
        href: doc.href,
      }
    }
    return {
      badge: BADGE_RECHAZADA,
      texto: 'El proceso fue rechazado. Primero solicita la carta de aceptación para abrir uno nuevo.',
      accion: 'Ir a la carta',
      href: CARTA_HREF,
    }
  }

  if (proceso.estado === 'aceptada') {
    return {
      badge: BADGE_ATENDIDA,
      texto: solicitud
        ? 'La coordinación aprobó tu solicitud.'
        : 'Tu proceso ya fue aceptado; este documento no aplica.',
      accion: solicitud ? 'Ver solicitud' : '',
      href: doc.href,
    }
  }

  if (!esCarta && !cartaLista) {
    return {
      badge: BADGE_PENDIENTE,
      texto: 'Disponible cuando la empresa complete la carta de aceptación.',
      accion: 'Ver carta',
      href: CARTA_HREF,
    }
  }

  if (solicitud) {
    return {
      badge: BADGE_PENDIENTE,
      texto: 'En espera de la respuesta del coordinador.',
      accion: 'Ver solicitud',
      href: doc.href,
    }
  }

  return { badge: null, texto: doc.descripcion, accion: 'Solicitar', href: doc.href }
}

export default function DocumentosPage() {
  const { profile } = useAuth()
  const alumnoId = profile?.id

  const { data: proceso } = useQuery({
    queryKey: ['proceso-periodo', alumnoId ?? ''],
    queryFn: async () => (alumnoId ? buscarProcesoConDocumentos(alumnoId) : null),
    enabled: Boolean(alumnoId),
  })

  const cartaDelProceso = proceso?.solicitudes.find((s) => s.documento === 'carta_aceptacion')
  const cartaLista = cartaCompletadaPorEmpresa(cartaDelProceso?.datos)
  const avance = Math.round((proceso?.solicitudes.length ?? 0) / DOCUMENTOS.length * 100)

  return (
    <div>
      <PageHeader
        icono="fa-solid fa-folder-open"
        titulo="Mis documentos"
        eyebrow="Portal del alumno"
        meta={
          proceso && (
            <>
              <span className="etiqueta">
                <i className="fa-solid fa-hashtag" aria-hidden="true" />
                <span className="font-mono">{proceso.folio}</span>
              </span>
              <span className="etiqueta">
                {proceso.solicitudes.length} de {DOCUMENTOS.length} documentos
              </span>
              <EstadoBadge estado={proceso.estado} />
            </>
          )
        }
      />

      <div className="space-y-4">
        {!proceso && (
          <Alerta icono="fa-solid fa-circle-info" tono="info" titulo="Para comenzar, solicita tu carta de aceptación">
            Con ella se abre tu proceso; después podrás enviar el avance y el cierre con los mismos datos.
          </Alerta>
        )}

        {proceso?.estado === 'rechazada' && (
          <Alerta icono="fa-solid fa-triangle-exclamation" tono="warn" titulo="Tu proceso fue rechazado">
            Solicita de nuevo la carta de aceptación para abrir un proceso nuevo.
          </Alerta>
        )}

        {proceso?.estado === 'pendiente' && !cartaLista && (
          <Alerta icono="fa-solid fa-building" tono="info" titulo="Carta pendiente de la empresa">
            Avance y cierre se desbloquean cuando la empresa complete giro, tamaño, fechas, horarios y
            directivo.
          </Alerta>
        )}
      </div>

      {proceso && (
        <div
          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-ink/8"
          role="progressbar"
          aria-valuenow={avance}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${proceso.solicitudes.length} de ${DOCUMENTOS.length} documentos`}
        >
          <div
            className="h-full rounded-full bg-brand-deep transition-[width] duration-500"
            style={{ width: `${avance}%` }}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DOCUMENTOS.map((doc, index) => {
          const tarjeta = evaluarTarjeta(proceso, doc)
          return (
            <Link
              key={doc.codigo}
              to={tarjeta.href}
              className="card group flex flex-col gap-3.5 p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink/40">
                    Paso {index + 1} de {DOCUMENTOS.length}
                  </p>
                  <h2 className="mt-1 flex items-center gap-2.5 text-base font-bold text-ink">
                    <i className={`${ICONOS_DOCUMENTO[doc.codigo]} text-brand`} aria-hidden="true" />
                    {doc.titulo}
                  </h2>
                </div>
                {tarjeta.badge && (
                  <span className={`badge ${tarjeta.badge.clase}`}>{tarjeta.badge.etiqueta}</span>
                )}
              </div>

              <p className="flex-1 text-sm leading-relaxed text-ink/55">{tarjeta.texto}</p>

              <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-brand">
                {tarjeta.accion || 'Ver detalle'}
                <i
                  className="fa-solid fa-arrow-right transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}