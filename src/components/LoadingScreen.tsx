export default function LoadingScreen({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-gray-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
      <p>{mensaje}</p>
    </div>
  )
}
