import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DOCUMENTOS, type CodigoDocumento } from '../../lib/documentos'
import { cartaCompletadaPorEmpresa } from '../../lib/empresa'
import {
  buscarProcesoConDocumentos,
  type EstadoProceso,
  type ProcesoConDocumentos,
} from '../../lib/procesos'

const CARTA_HREF = '/alumno/solicitud/carta-aceptacion'

const ICONOS_DOCUMENTO: Record<CodigoDocumento, string> = {
  carta_aceptacion: 'fa-solid fa-envelope',
  avance: 'fa-solid fa-clipboard-list',
  cierre: 'fa-solid fa-flag-checkered',
}

const COLORES_DOCUMENTO: Record<CodigoDocumento, string> = {
  carta_aceptacion: 'd-carta',
  avance: 'd-avance',
  cierre: 'd-cierre',
}

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

interface Tarjeta {
  badge: { clase: string; etiqueta: string } | null
  texto: string
  accion: string
  href: string
}

const BADGE_RECHAZADA = { clase: 'b-rechazada', etiqueta: 'Rechazada' }
const BADGE_ATENDIDA = { clase: 'b-atendido', etiqueta: 'Aceptada' }
const BADGE_PENDIENTE = { clase: 'b-pendiente', etiqueta: 'En revisión' }

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

function BadgeEstado({ estado }: { estado: EstadoProceso }) {
  return <span className={`badge ${ESTILOS_BADGE[estado]}`}>{ETIQUETAS_ESTADO[estado]}</span>
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

  return (
    <div>
      <div className="top">
        <div className="head-row">
          <div className="head-icon">
            <i className="fa-solid fa-folder-open" aria-hidden="true" />
          </div>
          <div className="head-text">
            <h1>Mis documentos</h1>
            <span className="head-sub">Portal del alumno</span>
          </div>
        </div>

        {proceso && (
          <div className="head-meta">
            <span className="tag">
              <i className="fa-solid fa-hashtag" aria-hidden="true" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{proceso.folio}</span>
            </span>
            <span className="meta-date">
              {proceso.solicitudes.length} de {DOCUMENTOS.length} documentos
            </span>
            <BadgeEstado estado={proceso.estado} />
          </div>
        )}
      </div>

      <p className="quiet" style={{ marginTop: -8 }}>
        Cada proceso agrupa tus 3 documentos: carta de aceptación, avance y cierre.
      </p>

      {!proceso && (
        <div className="alert alert-info">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <span>
            <strong style={{ display: 'block' }}>Para comenzar, solicita tu carta de aceptación</strong>
            Con ella se abre tu proceso; después podrás enviar el avance y el cierre con los mismos
            datos.
          </span>
        </div>
      )}

      {proceso?.estado === 'rechazada' && (
        <div className="alert alert-warn">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <span>
            <strong style={{ display: 'block' }}>Tu proceso fue rechazado</strong>
            Solicita de nuevo la carta de aceptación para abrir un proceso nuevo.
          </span>
        </div>
      )}

      {proceso?.estado === 'pendiente' && !cartaLista && (
        <div className="alert alert-info">
          <i className="fa-solid fa-building" aria-hidden="true" />
          <span>
            <strong style={{ display: 'block' }}>Carta pendiente de la empresa</strong>
            Avance y cierre se desbloquean cuando la empresa complete giro, tamaño, fechas,
            horarios y directivo.
          </span>
        </div>
      )}

      {proceso && (
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div
            className="bar"
            style={{ height: 6 }}
            title={`${proceso.solicitudes.length} de ${DOCUMENTOS.length} documentos`}
          >
            <span
              className="bar-total"
              style={{
                display: 'block',
                height: '100%',
                width: `${(proceso.solicitudes.length / DOCUMENTOS.length) * 100}%`,
                background: 'var(--accent)',
                borderRadius: 'var(--r-pill)',
                transition: 'width .6s var(--ease-spring)',
              }}
            />
          </div>
        </div>
      )}

      <div className="doc-grid">
        {DOCUMENTOS.map((doc, index) => {
          const tarjeta = evaluarTarjeta(proceso, doc)
          return (
            <Link key={doc.codigo} to={tarjeta.href} className="card hover-lift doc-card">
              <div className="doc-top">
                <span className={`doc-icon-box ${COLORES_DOCUMENTO[doc.codigo]}`}>
                  <i className={ICONOS_DOCUMENTO[doc.codigo]} aria-hidden="true" />
                </span>
                <div className="doc-info">
                  <span className="doc-paso">
                    Paso {index + 1} de {DOCUMENTOS.length}
                  </span>
                  <h2>{doc.titulo}</h2>
                </div>
                {tarjeta.badge && (
                  <span className={`badge ${tarjeta.badge.clase}`}>{tarjeta.badge.etiqueta}</span>
                )}
              </div>
              <p className="doc-desc">{tarjeta.texto}</p>
              <span className="doc-cta">
                {tarjeta.accion || 'Ver detalle'}
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
