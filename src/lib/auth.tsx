/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CandidateProfile } from '@shared/types'
import { emptyProfile } from '@shared/types'
import { api, getDemoToken, setDemoToken } from './api'
import { supabase, supabaseConfigured } from './supabase'

interface AuthValue {
  loading: boolean
  user: User | null
  demo: boolean
  profile: CandidateProfile
  configured: boolean
  refreshProfile: () => Promise<void>
  saveProfile: (patch: Partial<CandidateProfile>) => Promise<CandidateProfile>
  signInDemo: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [demo, setDemo] = useState(Boolean(getDemoToken()))
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile())

  const refreshProfile = useCallback(async () => {
    const p = await api<CandidateProfile>('/api/profile')
    setProfile(p)
  }, [])

  useEffect(() => {
    let cancelled = false
    const { data } = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null)
          if (session?.user) {
            void api<CandidateProfile>('/api/profile').then((p) => {
              if (!cancelled) setProfile(p)
            })
          }
        })
      : { data: { subscription: { unsubscribe() {} } } }

    async function boot() {
      if (getDemoToken()) {
        setDemo(true)
        try {
          const p = await api<CandidateProfile>('/api/profile')
          if (!cancelled) setProfile(p)
        } catch {
          /* API may still be starting */
        }
        if (!cancelled) setLoading(false)
        return
      }
      if (!supabase) {
        if (!cancelled) setLoading(false)
        return
      }
      const session = await supabase.auth.getSession()
      if (!cancelled) setUser(session.data.session?.user ?? null)
      if (session.data.session?.user) {
        try {
          const p = await api<CandidateProfile>('/api/profile')
          if (!cancelled) setProfile(p)
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setLoading(false)
    }
    void boot()
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      user,
      demo,
      profile,
      configured: supabaseConfigured,
      refreshProfile,
      saveProfile: async (patch) => {
        const next = await api<CandidateProfile>('/api/profile', {
          method: 'POST',
          body: JSON.stringify(patch),
        })
        setProfile(next)
        return next
      },
      signInDemo: () => {
        setDemoToken(true)
        setDemo(true)
        void refreshProfile()
      },
      signOut: async () => {
        setDemoToken(false)
        setDemo(false)
        setUser(null)
        setProfile(emptyProfile())
        await supabase?.auth.signOut()
      },
    }),
    [loading, user, demo, profile, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
