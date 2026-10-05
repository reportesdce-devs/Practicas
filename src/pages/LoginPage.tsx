import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import PantallaEstado from '../components/PantallaEstado'
import { useAuth } from '../context/AuthContext'
import { HOME_POR_ROLE } from '../lib/portal'
import { rolesOf } from '../lib/types'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const { session, profile, loading, profileLoading, error, signInWithGoogle, signOut } = useAuth()
  const [signingIn, setSigningIn] = useState(false)

  if (loading || (session && profileLoading)) return <LoadingScreen fondo="marco" />

  if (session) {
    if (profile) {
      const roles = rolesOf(profile)
      if (roles.length > 1) return <Navigate to="/elegir-portal" replace />
      if (roles.length === 1) return <Navigate to={HOME_POR_ROLE[roles[0]]} replace />
    }
    return (
      <div className="degradado-marco relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
        <div className="relative w-full max-w-md">
          <PantallaEstado
            icono="fa-solid fa-circle-exclamation"
            tono="danger"
            titulo="Sin acceso"
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
      </div>
    )
  }

  async function handleLogin() {
    setSigningIn(true)
    await signInWithGoogle()
    setSigningIn(false)
  }

  return (
    <div className="degradado-marco relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <div className="relative w-full max-w-sm">
        <div className="card flex min-h-[21rem] flex-col justify-center gap-7 rounded-2xl bg-paper p-7 shadow-lift sm:p-8">
          <div className="text-center">
            <img src="/logo-dce.png" alt="ISND" className="mx-auto h-9 w-auto" />
            <p className="mt-4 text-[0.62rem] font-bold tracking-[0.18em] text-brand uppercase">
              Prácticas profesionales
            </p>
          </div>

          <div className="border-t border-line pt-7">
            <h1 className="text-xl font-extrabold tracking-tight text-ink">Inicia sesión</h1>
            <p className="mt-1.5 text-sm text-ink/50">
              Cuenta institucional <span className="text-ink/70">@iest.edu.mx</span>
            </p>

            <button
              type="button"
              className="btn btn-outline btn-lg btn-block mt-6"
              onClick={() => void handleLogin()}
              disabled={signingIn}
            >
              {signingIn ? (
                <>
                  <span className="spinner text-ink/50" aria-hidden="true" />
                  Redirigiendo…
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continuar con Google
                </>
              )}
            </button>

            {error && (
              <div className="alerta bg-danger-soft text-danger mt-4">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}