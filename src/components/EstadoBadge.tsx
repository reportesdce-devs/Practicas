import type { EstadoProceso } from '../lib/procesos'

const TONOS: Record<EstadoProceso, string> = {
  pendiente: 'bg-warn-soft text-warn',
  aceptada: 'bg-ok-soft text-ok',
  rechazada: 'bg-danger-soft text-danger',
}

const ETIQUETAS: Record<EstadoProceso, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
}

export default function EstadoBadge({ estado }: { estado: EstadoProceso }) {
  return <span className={`badge ${TONOS[estado]}`}>{ETIQUETAS[estado]}</span>
}