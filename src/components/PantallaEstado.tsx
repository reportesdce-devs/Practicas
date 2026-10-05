import type { ReactNode } from 'react'

export type TonoEstado = 'brand' | 'ok' | 'danger' | 'ink'

const TONOS: Record<TonoEstado, string> = {
  brand: 'text-brand',
  ok: 'text-ok',
  danger: 'text-danger',
  ink: 'text-ink',
}

interface PantallaEstadoProps {
  icono: string
  tono?: TonoEstado
  titulo: string
  descripcion?: string
  children?: ReactNode
}

export default function PantallaEstado({
  icono,
  tono = 'brand',
  titulo,
  descripcion,
  children,
}: PantallaEstadoProps) {
  return (
    <div className="mx-auto w-full max-w-md py-6">
      <div className="card rounded-2xl bg-paper p-7 shadow-lift sm:p-8">
        <div className="flex items-center gap-3">
          <i className={`${icono} text-base ${TONOS[tono]}`} aria-hidden="true" />
          <h1 className="text-lg font-bold text-ink">{titulo}</h1>
        </div>
        {descripcion && <p className="mt-3 text-sm leading-relaxed text-ink/50">{descripcion}</p>}
        {children && <div className="mt-6 space-y-2">{children}</div>}
      </div>
    </div>
  )
}