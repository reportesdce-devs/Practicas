import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { guardarPortal, HOME_POR_ROLE } from '../../lib/portal'
import type { Role } from '../../lib/types'

const OPCIONES: {
  rol: Role
  titulo: string
  descripcion: string
  icono: string
}[] = [
  {
    rol: 'alumno',
    titulo: 'Portal del alumno',
    descripcion: 'Solicita y consulta tus documentos.',
    icono: 'fa-solid fa-user-graduate',
  },
  {
    rol: 'coordinador',
    titulo: 'Panel de coordinación',
    descripcion: 'Revisa y aprueba los procesos.',
    icono: 'fa-solid fa-clipboard-list',
  },
]

export default function RoleSelectorPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  function elegir(rol: Role) {
    guardarPortal(rol)
    navigate(HOME_POR_ROLE[rol], { replace: true })
  }

  return (
    <div className="degradado-marco relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <div className="relative w-full max-w-md">
        <div className="card rounded-2xl bg-paper p-7 shadow-lift sm:p-8">
          <div className="text-center">
            <img src="/logo-dce.png" alt="ISND" className="mx-auto h-9 w-auto" />
            <p className="mt-4 text-[0.62rem] font-bold tracking-[0.18em] text-brand uppercase">
              Prácticas profesionales
            </p>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-ink">
              ¿A dónde quieres entrar?
            </h1>
          </div>

          <div className="mt-7 space-y-2.5 border-t border-line pt-6">
            {OPCIONES.map((opcion) => (
              <button
                key={opcion.rol}
                type="button"
                onClick={() => elegir(opcion.rol)}
                className="group flex w-full items-center gap-4 rounded-xl border border-line bg-white p-4 text-left transition hover:border-ink/25"
              >
                <i className={`${opcion.icono} text-lg text-brand`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-bold text-ink">{opcion.titulo}</strong>
                  <span className="mt-0.5 block text-xs text-ink/45">{opcion.descripcion}</span>
                </span>
                <i
                  className="fa-solid fa-chevron-right text-xs text-ink/20 transition group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-block mt-5"
            onClick={() => void signOut()}
          >
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}