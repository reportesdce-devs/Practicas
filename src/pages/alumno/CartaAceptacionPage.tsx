import { Link } from 'react-router-dom'

export default function CartaAceptacionPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/alumno/documentos" className="text-sm font-semibold text-brand-dark">
        ← Volver a documentos
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Solicitud de carta de aceptación</h1>
      <p className="mt-2 text-sm text-gray-500">
        Formulario pendiente de definición (campos por confirmar con la coordinación).
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
        El formulario se construirá en la siguiente fase.
      </div>
    </div>
  )
}
