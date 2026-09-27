export default function SolicitudesPage() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
        Panel del coordinador
      </p>
      <h1 className="mt-1 text-2xl font-bold">Solicitudes de alumnos</h1>
      <p className="mt-2 text-sm text-gray-500">
        Aquí se mostrarán las solicitudes enviadas por los alumnos.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400 shadow-sm">
        Todavía no hay solicitudes que mostrar.
      </div>
    </div>
  )
}
