/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Provider, User } from '@supabase/supabase-js'
import type { CandidateProfile } from '@shared/types'
import { emptyProfile, isStaffRole } from '@shared/types'
import { api, getDemoToken, setAccessToken, setDemoToken } from './api'
import { identityFromUser } from './identity'
import { oauthOptions } from './social'
import { supabase, supabaseConfigured, upsertOwnProfile } from './supabase'

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
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  destinationFor: (p?: CandidateProfile) => string
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

let profileInflight: Promise<CandidateProfile> | null = null

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
      profileInflight = null
      setProfile(emptyProfile())
      return emptyProfile()
    }
    if (profileInflight) return profileInflight
    const work = (async () => {
      try {
        const synced = next.identities?.length ? await syncSocialProfile(next) : await refreshProfile()
        setProfile(synced)
        return synced
      } catch {
        const fallback = { ...emptyProfile(), email: next.email ?? '' }
        setProfile(fallback)
        return fallback
      } finally {
        profileInflight = null
      }
    })()
    profileInflight = work
    return work
  }, [refreshProfile, syncSocialProfile])

  useEffect(() => {
    let cancelled = false
    const { data } = supabase
      ? supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return
          setAccessToken(session?.access_token ?? null)
          if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            if (session?.user) setUser(session.user)
            return
          }
          setUser(session?.user ?? null)
          if (event === 'SIGNED_OUT') {
            setDemoToken(false)
            setDemo(false)
            setProfile(emptyProfile())
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
      setAccessToken(session.data.session?.access_token ?? null)
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
        if (isStaffRole(p.role)) return '/admin'
        if (p.role === 'employer') return p.companyName || p.onboardingCompleted ? '/employer' : '/employer/setup'
        return '/app'
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw error
        if (!data.user) throw new Error('Sign in failed.')
        return establish(data.user)
      },
      signUpEmail: async (email, password, extras) => {
        if (!supabase) throw new Error('Add your Supabase keys in .env, then restart the app.')
        setDemoToken(false)
        setDemo(false)
        const role = extras?.role === 'employer' ? 'employer' : 'candidate'
        const companyName = extras?.companyName?.trim() ?? ''
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { role, company_name: companyName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
          throw new Error('That email is already registered. Sign in instead.')
        }
        let user = data.session?.user ?? data.user ?? null
        if (!data.session && user) {
          const retry = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          })
          if (retry.error && /confirm|not confirmed/i.test(retry.error.message)) {
            const pending = new Error('Check your email to confirm the account, then sign in.')
            ;(pending as Error & { code: string }).code = 'confirm'
            throw pending
          }
          if (retry.error) throw retry.error
          user = retry.data.user
        }
        if (!user) throw new Error('Account created, but sign in failed. Try logging in.')
        await upsertOwnProfile({ id: user.id, email: user.email ?? email, role, companyName })
        const profile = await establish(user)
        if (role === 'employer' && !isStaffRole(profile.role)) {
          try {
            const next = await api<CandidateProfile>('/api/profile', {
              method: 'POST',
              body: JSON.stringify({
                role: 'employer',
                companyName: companyName || profile.companyName,
                onboardingCompleted: true,
              }),
            })
            setProfile(next)
            return next
          } catch {
            const next = {
              ...profile,
              role: 'employer' as const,
              companyName: companyName || profile.companyName,
              onboardingCompleted: true,
            }
            setProfile(next)
            return next
          }
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
      resetPassword: async (email) => {
        if (!supabase) throw new Error('Add your Supabase keys in .env, then restart the app.')
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/reset`,
        })
        if (error) throw error
      },
      updatePassword: async (password) => {
        if (!supabase) throw new Error('Add your Supabase keys in .env, then restart the app.')
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
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
        setAccessToken(null)
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
