import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleOf } from '../lib/types'
import LoadingScreen from './LoadingScreen'

export default function RequireAuth() {
  const { session, profile, loading, profileLoading, signOut } = useAuth()

  if (loading || (session && profileLoading)) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />

  if (!profile || !roleOf(profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-red-700">Sin acceso al sistema</h1>
          <p className="mt-2 text-sm text-gray-600">
            {profile
              ? 'Tu usuario no tiene un rol asignado. Contacta a la coordinación.'
              : 'Tu correo no está registrado en la base de datos de la institución.'}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
