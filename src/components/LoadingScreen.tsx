export default function LoadingScreen({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-sm text-muted">
      <span className="logo logo-lg">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
      </span>
      <p className="quiet" style={{ fontWeight: 700 }}>
        {mensaje}
      </p>
    </div>
  )
}