import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { limpiarPortal, portalGuardado } from '../lib/portal'
import { rolesOf } from '../lib/types'

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const roles = rolesOf(profile)
  const multiRol = roles.length > 1
  const activo = multiRol ? (portalGuardado() ?? roles[0]) : roles[0]
  const inicial = profile?.nombre?.trim().charAt(0).toUpperCase() ?? '?'

  const nav =
    activo === 'coordinador'
      ? [{ to: '/coordinador', icono: 'fa-solid fa-clipboard-list', etiqueta: 'Procesos' }]
      : [{ to: '/alumno/documentos', icono: 'fa-solid fa-folder-open', etiqueta: 'Mis documentos' }]

  function cambiarPortal() {
    limpiarPortal()
    navigate('/elegir-portal', { replace: true })
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/logo-dce.png" alt="Logo de Ingenierías" />
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
            >
              <i className={item.icono} aria-hidden="true" />
              {item.etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          {multiRol && (
            <button type="button" className="sidebar-portal" onClick={cambiarPortal}>
              <i className="fa-solid fa-right-left" aria-hidden="true" />
              Cambiar de portal
            </button>
          )}
          <div className="session-id">
            <span className="avatar">{inicial}</span>
            <span className="id-txt">
              <span className="id-mail">{profile?.nombre ?? 'Usuario'}</span>
              <span className="id-rol">
                {activo === 'coordinador' ? 'Coordinación' : 'Alumno'}
                {profile?.carreras?.sigla ? ` · ${profile.carreras.sigla}` : ''}
              </span>
            </span>
          </div>
          <button type="button" className="sidebar-logout" onClick={() => void signOut()}>
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
            Salir
          </button>
        </div>
      </aside>

      <main className="content">
        <div className="app">
          <Outlet />
        </div>
      </main>
    </div>
  )
}