import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { rolesOf } from '../lib/types'
import LoadingScreen from './LoadingScreen'
import PantallaEstado from './PantallaEstado'

export default function RequireAuth() {
  const { session, profile, loading, profileLoading, signOut } = useAuth()

  if (loading || (session && profileLoading)) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />

  if (!profile || rolesOf(profile).length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-5">
        <PantallaEstado
          icono="fa-solid fa-circle-exclamation"
          tono="danger"
          titulo="Sin acceso al sistema"
          descripcion={
            profile
              ? 'Tu usuario no tiene un rol asignado. Contacta a la coordinación.'
              : 'Tu correo no está registrado en la base de datos de la institución.'
          }
        >
          <button type="button" className="btn btn-dark btn-block" onClick={() => void signOut()}>
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
            Cerrar sesión
          </button>
        </PantallaEstado>
      </div>
    )
  }

  return <Outlet />
}