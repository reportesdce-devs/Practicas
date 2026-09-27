import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import { useAuth } from '../context/AuthContext'
import { roleOf } from '../lib/types'

function NoAccess({ message, onSignOut }: { message: string; onSignOut: () => Promise<void> }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-red-700">Sin acceso</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { session, profile, loading, profileLoading, error, signInWithGoogle, signOut } = useAuth()
  const [signingIn, setSigningIn] = useState(false)

  if (loading || (session && profileLoading)) return <LoadingScreen />

  if (session) {
    if (profile) {
      const role = roleOf(profile)
      if (role === 'coordinador') return <Navigate to="/coordinador" replace />
      if (role === 'alumno') return <Navigate to="/alumno/documentos" replace />
      return (
        <NoAccess
          message="Tu usuario no tiene un rol asignado. Contacta a la coordinación."
          onSignOut={signOut}
        />
      )
    }
    return (
      <NoAccess
        message="Tu correo no está registrado en la base de datos de la institución."
        onSignOut={signOut}
      />
    )
  }

  async function handleLogin() {
    setSigningIn(true)
    await signInWithGoogle()
    setSigningIn(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-[56px] place-items-center rounded-lg bg-brand text-sm font-black text-white">
            ISND
          </span>
          <span>
            <strong className="block text-sm">Prácticas Profesionales</strong>
            <small className="block text-xs text-gray-500">
              Sistemas y Negocios Digitales
            </small>
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-gray-500">
            Accede con tu correo institucional.
          </p>

          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={signingIn}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-200 text-xs font-bold">
              G
            </span>
            {signingIn ? 'Redirigiendo…' : 'Continuar con Google'}
          </button>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <p className="mt-4 text-center text-xs text-gray-400">
            Tus datos se validan contra el registro institucional.
          </p>
        </div>
      </div>
    </div>
  )
}
