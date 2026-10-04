import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { rolesOf, type Role } from '../lib/types'
import { portalGuardado } from '../lib/portal'

export default function RequireRole({ role }: { role: Role }) {
  const { profile } = useAuth()
  const roles = rolesOf(profile)

  if (!roles.includes(role)) return <Navigate to="/" replace />

  if (roles.length > 1) {
    const activo = portalGuardado() ?? roles[0]
    if (activo !== role) return <Navigate to="/" replace />
  }

  return <Outlet />
}