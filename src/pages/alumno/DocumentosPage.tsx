import { Link } from 'react-router-dom'

const documentos = [
  {
    id: 'carta-aceptacion',
    titulo: 'Carta de aceptación',
    descripcion: 'Solicitud de carta para la empresa donde realizarás tus prácticas.',
    href: '/alumno/solicitud/carta-aceptacion',
  },
]

export default function DocumentosPage() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
        Portal del alumno
      </p>
      <h1 className="mt-1 text-2xl font-bold">Consulta de documentos para prácticas</h1>
      <p className="mt-2 text-sm text-gray-500">
        Selecciona el documento que deseas solicitar.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documentos.map((doc) => (
          <Link
            key={doc.id}
            to={doc.href}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
          >
            <h2 className="font-semibold">{doc.titulo}</h2>
            <p className="mt-2 text-sm text-gray-500">{doc.descripcion}</p>
            <span className="mt-4 inline-block text-sm font-bold text-brand-dark">
              Solicitar →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
