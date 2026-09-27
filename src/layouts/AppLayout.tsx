import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleOf } from '../lib/types'

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const rol = roleOf(profile)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-[52px] place-items-center rounded-lg bg-brand text-sm font-black text-white">
              ISND
            </span>
            <span>
              <strong className="block text-sm">Prácticas Profesionales</strong>
              <small className="block text-xs text-gray-500">
                Sistemas y Negocios Digitales
              </small>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <strong className="block text-sm">{profile?.nombre}</strong>
              <small className="text-xs text-gray-500">
                {rol === 'coordinador' ? 'Coordinación' : 'Alumno'}
                {profile?.carreras?.sigla ? ` · ${profile.carreras.sigla}` : ''}
              </small>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl justify-between gap-4 px-5 py-4 text-xs text-gray-500">
          <span>ISND · Prácticas Profesionales</span>
          <span>Sistema de solicitudes de documentos</span>
        </div>
      </footer>
    </div>
  )
}
