import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Persona } from '../lib/types'
import { AuthContext, type AuthContextValue } from './AuthContext'

async function fetchProfile(email: string): Promise<Persona | null> {
  const { data, error } = await supabase
    .from('personas')
    .select('id, nombre, tipo, rol, correo, carrera_id, carreras(nombre, sigla)')
    .eq('correo', email)
    .maybeSingle()

  if (error) {
    console.error('Error consultando perfil:', error.message)
    return null
  }
  return data as Persona | null
}

interface ProfileState {
  email: string | null
  data: Persona | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileState, setProfileState] = useState<ProfileState>({ email: null, data: null })

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  const email = session?.user.email ?? null

  useEffect(() => {
    if (!email) return

    let cancelled = false
    fetchProfile(email).then((result) => {
      if (cancelled) return
      setProfileState({ email, data: result })
    })

    return () => {
      cancelled = true
    }
  }, [email])

  const profile = profileState.email === email ? profileState.data : null
  const profileLoading = Boolean(email) && profileState.email !== email

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (oauthError) setError(oauthError.message)
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    await supabase.auth.signOut()
    setProfileState({ email: null, data: null })
  }, [])

  const value: AuthContextValue = {
    session,
    profile,
    loading,
    profileLoading,
    error,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
