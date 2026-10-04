import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { rolesOf } from '../lib/types'
import { HOME_POR_ROLE, portalGuardado } from '../lib/portal'

export default function RoleRedirect() {
  const { profile } = useAuth()
  const roles = rolesOf(profile)

  if (roles.length === 0) return <Navigate to="/elegir-portal" replace />

  if (roles.length === 1) return <Navigate to={HOME_POR_ROLE[roles[0]]} replace />

  const activo = portalGuardado()
  if (activo) return <Navigate to={HOME_POR_ROLE[activo]} replace />
  return <Navigate to="/elegir-portal" replace />
}