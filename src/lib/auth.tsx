/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Provider, User } from '@supabase/supabase-js'
import type { CandidateProfile } from '@shared/types'
import { emptyProfile } from '@shared/types'
import { api, getDemoToken, setDemoToken } from './api'
import { identityFromUser } from './identity'
import { oauthOptions } from './social'
import { supabase, supabaseConfigured } from './supabase'

interface AuthValue {
  loading: boolean
  user: User | null
  demo: boolean
  profile: CandidateProfile
  configured: boolean
  refreshProfile: () => Promise<CandidateProfile>
  saveProfile: (patch: Partial<CandidateProfile>) => Promise<CandidateProfile>
  signInDemo: () => Promise<CandidateProfile>
  signInDemoEmployer: () => Promise<CandidateProfile>
  signInEmail: (email: string, password: string) => Promise<CandidateProfile>
  signUpEmail: (
    email: string,
    password: string,
    extras?: { role?: 'candidate' | 'employer'; companyName?: string },
  ) => Promise<CandidateProfile>
  signInGoogle: () => Promise<void>
  signInSocial: (provider: Provider) => Promise<void>
  destinationFor: (p?: CandidateProfile) => string
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
    return p
  }, [])

  const syncSocialProfile = useCallback(async (next: User) => {
    try {
      return await api<CandidateProfile>('/api/profile/sync-identity', {
        method: 'POST',
        body: JSON.stringify(identityFromUser(next)),
      })
    } catch {
      return refreshProfile()
    }
  }, [refreshProfile])

  const establish = useCallback(async (next: User | null) => {
    setUser(next)
    if (!next) {
      setProfile(emptyProfile())
      return emptyProfile()
    }
    try {
      const synced = next.identities?.length ? await syncSocialProfile(next) : await refreshProfile()
      setProfile(synced)
      return synced
    } catch {
      const fallback = { ...emptyProfile(), email: next.email ?? '' }
      setProfile(fallback)
      return fallback
    }
  }, [refreshProfile, syncSocialProfile])

  useEffect(() => {
    let cancelled = false
    const { data } = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return
          setUser(session?.user ?? null)
          if (session?.user) {
            setDemoToken(false)
            setDemo(false)
            void (session.user.identities?.length
              ? api<CandidateProfile>('/api/profile/sync-identity', {
                  method: 'POST',
                  body: JSON.stringify(identityFromUser(session.user)),
                })
              : api<CandidateProfile>('/api/profile')
            ).then((p) => {
              if (!cancelled) setProfile(p)
            }).catch(() => {})
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
      destinationFor: (p = profile) => {
        if (p.role === 'employer') return p.companyName || p.onboardingCompleted ? '/employer' : '/employer/setup'
        return p.onboardingCompleted ? '/app' : '/onboarding'
      },
      saveProfile: async (patch) => {
        const next = await api<CandidateProfile>('/api/profile', {
          method: 'POST',
          body: JSON.stringify(patch),
        })
        setProfile(next)
        return next
      },
      signInDemo: async () => {
        setDemoToken(true)
        setDemo(true)
        return refreshProfile()
      },
      signInDemoEmployer: async () => {
        setDemoToken('employer')
        setDemo(true)
        return refreshProfile()
      },
      signInEmail: async (email, password) => {
        if (!supabase) throw new Error('Add your Supabase keys in .env, then restart the app.')
        setDemoToken(false)
        setDemo(false)
        let { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error && /confirm/i.test(error.message)) {
          await api('/api/auth/confirm', { method: 'POST', body: JSON.stringify({ email }) })
          const retry = await supabase.auth.signInWithPassword({ email, password })
          data = retry.data
          error = retry.error
        }
        if (error) throw error
        if (!data.user) throw new Error('Sign in failed.')
        return establish(data.user)
      },
      signUpEmail: async (email, password, extras) => {
        if (!supabase) throw new Error('Add your Supabase keys in .env, then restart the app.')
        setDemoToken(false)
        setDemo(false)
        await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, role: extras?.role, companyName: extras?.companyName }),
        })
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.user) throw error ?? new Error('Account created, but sign in failed. Try logging in.')
        const profile = await establish(data.user)
        if (extras?.role === 'employer') {
          const next = await api<CandidateProfile>('/api/profile', {
            method: 'POST',
            body: JSON.stringify({
              role: 'employer',
              companyName: extras.companyName ?? profile.companyName,
              onboardingCompleted: true,
            }),
          })
          setProfile(next)
          return next
        }
        return profile
      },
      signInSocial: async (provider: Provider) => {
        if (!supabase) throw new Error('Add your Supabase keys in .env, then restart the app.')
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { ...oauthOptions(provider), skipBrowserRedirect: true },
        })
        if (error) throw error
        if (data.url) window.location.assign(data.url)
      },
      signInGoogle: async () => {
        if (!supabase) throw new Error('Add your Supabase keys in .env, then restart the app.')
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { ...oauthOptions('google'), skipBrowserRedirect: true },
        })
        if (error) throw error
        if (data.url) window.location.assign(data.url)
      },
      signOut: async () => {
        setDemoToken(false)
        setDemo(false)
        setUser(null)
        setProfile(emptyProfile())
        await supabase?.auth.signOut()
      },
    }),
    [loading, user, demo, profile, refreshProfile, establish],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
