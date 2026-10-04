import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { rolesOf } from '../lib/types'
import LoadingScreen from './LoadingScreen'

export default function RequireAuth() {
  const { session, profile, loading, profileLoading, signOut } = useAuth()

  if (loading || (session && profileLoading)) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />

  if (!profile || rolesOf(profile).length === 0) {
    return (
      <div className="gate-shell">
        <div className="app">
          <div className="card gate-card">
            <div className="gate-head">
              <img className="gate-logo" src="/logo-dce.png" alt="Logo de Ingenierías" />
            </div>
            <div className="gate-body">
              <div className="gate-title" style={{ marginBottom: 14 }}>
                <h1>Sin acceso al sistema</h1>
                <p>Prácticas profesionales</p>
              </div>
              <div className="alert alert-danger">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                <span>
                  {profile
                    ? 'Tu usuario no tiene un rol asignado. Contacta a la coordinación.'
                    : 'Tu correo no está registrado en la base de datos de la institución.'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-dark btn-block"
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

  return <Outlet />
}
