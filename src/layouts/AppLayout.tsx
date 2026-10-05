import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { iniciales } from '../lib/formato'
import { limpiarPortal, portalGuardado } from '../lib/portal'
import { rolesOf } from '../lib/types'

interface ItemNav {
  to: string
  icono: string
  etiqueta: string
  etiquetaMovil: string
}

const ICONO_SALIR = 'fa-solid fa-arrow-right-from-bracket'

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const roles = rolesOf(profile)
  const multiRol = roles.length > 1
  const activo = multiRol ? (portalGuardado() ?? roles[0]) : roles[0]

  const nombre = profile?.nombre ?? 'Usuario'
  const cargo = activo === 'coordinador' ? 'Coordinación' : 'Alumno'

  const nav: ItemNav[] =
    activo === 'coordinador'
      ? [
          {
            to: '/coordinador',
            icono: 'fa-solid fa-clipboard-list',
            etiqueta: 'Procesos',
            etiquetaMovil: 'Procesos',
          },
        ]
      : [
          {
            to: '/alumno/documentos',
            icono: 'fa-solid fa-folder-open',
            etiqueta: 'Mis documentos',
            etiquetaMovil: 'Documentos',
          },
        ]

  function cambiarPortal() {
    limpiarPortal()
    navigate('/elegir-portal', { replace: true })
  }

  const botonIcono =
    'inline-flex size-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white'

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <header className="barra-lateral sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
        <div className="relative flex min-w-0 items-center gap-2.5">
          <img src="/logo-dce.png" alt="ISND" className="h-6 w-auto brightness-0 invert" />
          <span className="truncate text-sm font-semibold text-white">{nombre}</span>
        </div>
        <div className="relative flex shrink-0 items-center gap-1">
          {multiRol && (
            <button
              type="button"
              className={botonIcono}
              onClick={cambiarPortal}
              aria-label="Cambiar de portal"
              title="Cambiar de portal"
            >
              <i className="fa-solid fa-right-left" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className={botonIcono}
            onClick={() => void signOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <i className={ICONO_SALIR} aria-hidden="true" />
          </button>
        </div>
      </header>

      <aside className="degradado-lateral sticky top-0 hidden h-dvh flex-col overflow-hidden px-4 py-5 lg:flex">
        <div className="relative mb-6 flex items-center gap-2.5 px-1">
          <img src="/logo-dce.png" alt="ISND" className="h-auto w-full brightness-0 invert" />
          {/* <div className="leading-tight">
            <p className="text-sm font-bold text-white">Prácticas</p>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/40">
              ISND
            </p>
          </div> */}
        </div>

        <nav className="relative flex-1 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-brand-deep text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <i className={item.icono} aria-hidden="true" />
              {item.etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="relative mt-4 space-y-2 border-t border-white/10 pt-4">
          {multiRol && (
            <button
              type="button"
              onClick={cambiarPortal}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <i className="fa-solid fa-right-left" aria-hidden="true" />
              Cambiar de portal
            </button>
          )}

          <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white">
              {iniciales(nombre)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs font-semibold text-white">{nombre}</span>
              <span className="block truncate text-[0.6rem] uppercase tracking-[0.1em] text-white/50">
                {cargo}
                {profile?.carreras?.sigla ? ` · ${profile.carreras.sigla}` : ''}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-deep px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-brand-deep-dark"
          >
            <i className={ICONO_SALIR} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-[1320px] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 backdrop-blur lg:hidden">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `safe-bottom flex flex-1 flex-col items-center gap-1 pt-2.5 text-[0.65rem] font-semibold transition ${
                isActive ? 'text-brand' : 'text-ink/45'
              }`
            }
          >
            <i className={`${item.icono} text-base`} aria-hidden="true" />
            {item.etiquetaMovil}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}