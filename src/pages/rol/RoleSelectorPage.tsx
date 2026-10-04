import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { guardarPortal, HOME_POR_ROLE } from '../../lib/portal'
import type { Role } from '../../lib/types'

const OPCIONES: {
  rol: Role
  titulo: string
  descripcion: string
  icono: string
  claseIcono: string
}[] = [
  {
    rol: 'alumno',
    titulo: 'Portal del alumno',
    descripcion: 'Solicita y consulta tus documentos de prácticas profesionales.',
    icono: 'fa-solid fa-user-graduate',
    claseIcono: 'a-alumno',
  },
  {
    rol: 'coordinador',
    titulo: 'Panel de coordinación',
    descripcion: 'Revisa, acepta o rechaza los procesos de prácticas.',
    icono: 'fa-solid fa-clipboard-list',
    claseIcono: 'a-coordinador',
  },
]

export default function RoleSelectorPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  function elegir(rol: Role) {
    guardarPortal(rol)
    navigate(HOME_POR_ROLE[rol], { replace: true })
  }

  return (
    <div className="gate-shell">
      <div className="app">
        <div className="card gate-card">
          <div className="gate-head">
            <img className="gate-logo" src="/logo-dce.png" alt="Logo de Ingenierías" />
          </div>
          <div className="gate-body">
            <div className="login-head">
              <span className="login-icon">
                <i className="fa-solid fa-right-left" aria-hidden="true" />
              </span>
              <h2>¿A dónde quieres entrar?</h2>
              <p className="login-desc">
                {profile?.nombre ? `Hola, ${profile.nombre}. ` : 'Tu cuenta '}tiene acceso a dos
                portales. Elige uno para continuar.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {OPCIONES.map((opcion) => (
                <button
                  key={opcion.rol}
                  type="button"
                  className="rol-card"
                  onClick={() => elegir(opcion.rol)}
                >
                  <span className={`rol-icon ${opcion.claseIcono}`}>
                    <i className={opcion.icono} aria-hidden="true" />
                  </span>
                  <span className="rol-txt">
                    <strong>{opcion.titulo}</strong>
                    <span>{opcion.descripcion}</span>
                  </span>
                  <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ marginTop: 16 }}
              onClick={() => void signOut()}
            >
              <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}