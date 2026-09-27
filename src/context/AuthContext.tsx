import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Persona } from '../lib/types'

export interface AuthContextValue {
  session: Session | null
  profile: Persona | null
  loading: boolean
  profileLoading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}
