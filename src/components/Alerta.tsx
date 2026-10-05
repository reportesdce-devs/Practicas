import type { ReactNode } from 'react'

export type TonoAlerta = 'brand' | 'ok' | 'warn' | 'danger' | 'info'

const TONOS: Record<TonoAlerta, string> = {
  brand: 'bg-brand-soft text-brand-dark',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
}

interface AlertaProps {
  icono: string
  tono?: TonoAlerta
  titulo?: ReactNode
  className?: string
  children: ReactNode
}

export default function Alerta({ icono, tono = 'brand', titulo, className = '', children }: AlertaProps) {
  return (
    <div className={`alerta ${TONOS[tono]} ${className}`.trim()}>
      <i className={`${icono} mt-0.5 shrink-0`} aria-hidden="true" />
      <span className="min-w-0">
        {titulo && <strong className="block">{titulo}</strong>}
        {children}
      </span>
    </div>
  )
}