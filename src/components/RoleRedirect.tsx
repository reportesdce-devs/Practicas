import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleOf } from '../lib/types'

export default function RoleRedirect() {
  const { profile } = useAuth()
  const destino = roleOf(profile) === 'coordinador' ? '/coordinador' : '/alumno/documentos'
  return <Navigate to={destino} replace />
}
