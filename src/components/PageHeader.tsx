import type { ReactNode } from 'react'

interface PageHeaderProps {
  icono: string
  titulo: string
  eyebrow: string
  meta?: ReactNode
}

export default function PageHeader({ icono, titulo, eyebrow, meta }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="flex items-center gap-3">
        <i className={`${icono} text-lg text-brand`} aria-hidden="true" />
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
          <h1 className="text-xl font-extrabold tracking-tight text-ink">{titulo}</h1>
        </div>
      </div>
      {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
    </header>
  )
}