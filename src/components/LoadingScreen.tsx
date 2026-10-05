export default function LoadingScreen({
  mensaje = 'Cargando.',
  fondo = 'blanco',
}: {
  mensaje?: string
  /** `marco` para las pantallas que ya usan el fondo con degradado. */
  fondo?: 'marco' | 'blanco'
}) {
  const sobreMarco = fondo === 'marco'

  return (
    <div
      className={`flex min-h-dvh flex-col items-center justify-center gap-4 ${
        sobreMarco ? 'degradado-marco' : 'bg-paper'
      }`}
    >
      <span className="spinner text-xl text-brand" aria-hidden="true" />
      <p className={`text-sm font-semibold ${sobreMarco ? 'text-white/60' : 'text-ink/50'}`}>
        {mensaje}
      </p>
    </div>
  )
}