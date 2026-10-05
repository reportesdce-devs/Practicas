interface DatoCampoProps {
  label: string
  valor?: string | null
}

export default function DatoCampo({ label, valor }: DatoCampoProps) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink/40">{label}</p>
      <p className="mt-0.5 text-sm font-semibold break-words text-ink">{valor || '—'}</p>
    </div>
  )
}