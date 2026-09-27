import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleOf, type Role } from '../lib/types'

export default function RequireRole({ role }: { role: Role }) {
  const { profile } = useAuth()

  if (roleOf(profile) !== role) return <Navigate to="/" replace />
  return <Outlet />
}
