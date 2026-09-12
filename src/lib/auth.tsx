/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Provider, User } from '@supabase/supabase-js'
import type { CandidateProfile } from '@shared/types'
import { emptyProfile, isStaffRole, parseAccountRole } from '@shared/types'
import { api, clearServerSession, getDemoToken, setAccessToken, setDemoToken, writeServerSession } from './api'
import { identityFromUser } from './identity'
import { oauthOptions } from './social'
import {
  lastAccountRole,
  peekIntendedRole,
  rememberLastRole,
  supabase,
  supabaseConfigured,
  upsertOwnProfile,
} from './supabase'

interface AuthValue {
  loading: boolean
  ready: boolean
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
let inflightUid = ''

function profileForSession(profile: CandidateProfile, user: User | null, demo: boolean) {
  if (demo || !user) return true
  if (profile.id && profile.id === user.id) return true
  const email = profile.email.trim().toLowerCase()
  const userEmail = (user.email ?? '').trim().toLowerCase()
  return Boolean(email && userEmail && email === userEmail)
}

function pageRoleHint(): 'employer' | null {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname
  const role = new URLSearchParams(window.location.search).get('role')
  if (role === 'employer' || path.startsWith('/employer') || path === '/employers' || path === '/join') return 'employer'
  return null
}

function usesSocialIdentity(user: User) {
  return (user.identities ?? []).some((identity) => identity.provider && identity.provider !== 'email')
}

function hintedRole(user: User | null, profile: CandidateProfile, synced: boolean) {
  if (isStaffRole(profile.role)) return profile.role
  if (profile.role === 'employer') return 'employer'
  if (synced) return parseAccountRole(profile.role)
  const meta = parseAccountRole(user?.user_metadata?.role)
  if (meta === 'employer' || isStaffRole(meta)) return meta
  if (peekIntendedRole() === 'employer' || pageRoleHint() === 'employer') return 'employer'
  const last = lastAccountRole()
  if (last === 'employer' || last === 'admin' || last === 'super_admin') return last
  return parseAccountRole(profile.role)
}

const COMPANY_CACHE_KEY = 'atelier-company-name'

function readCachedCompany(userId?: string) {
  if (!userId) return ''
  try {
    return localStorage.getItem(`${COMPANY_CACHE_KEY}:${userId}`)?.trim() ?? ''
  } catch {
    return ''
  }
}

function writeCachedCompany(userId: string | undefined, companyName?: string | null) {
  const name = companyName?.trim()
  if (!userId || !name) return
  try {
    localStorage.setItem(`${COMPANY_CACHE_KEY}:${userId}`, name)
  } catch {
    /* ignore */
  }
}

function rememberProfile(p: CandidateProfile) {
  rememberLastRole(p.role)
  writeCachedCompany(p.id, p.companyName)
  return p
}

function seedFromUser(user: User): CandidateProfile {
  const role = hintedRole(user, { ...emptyProfile(), email: user.email ?? '', id: user.id }, false)
  const company =
    String(user.user_metadata?.company_name ?? '').trim() || readCachedCompany(user.id)
  return {
    ...emptyProfile(),
    id: user.id,
    email: user.email ?? '',
    role,
    companyName: company,
    onboardingCompleted: role === 'employer' || Boolean(company),
  }
}

/** Keep already-loaded fields when auth re-seeds the same user (avoids name/company flash). */
function mergeSeed(current: CandidateProfile, seed: CandidateProfile): CandidateProfile {
  if (!current.id || current.id !== seed.id) {
    return {
      ...seed,
      companyName: seed.companyName || readCachedCompany(seed.id),
    }
  }
  return {
    ...seed,
    firstName: seed.firstName || current.firstName,
    lastName: seed.lastName || current.lastName,
    companyName: seed.companyName || current.companyName || readCachedCompany(seed.id),
    companyWebsite: seed.companyWebsite || current.companyWebsite,
    avatarUrl: seed.avatarUrl || current.avatarUrl,
    headline: seed.headline || current.headline,
    industry: seed.industry || current.industry,
    city: seed.city || current.city,
    country: seed.country || current.country,
    onboardingCompleted: seed.onboardingCompleted || current.onboardingCompleted,
    role:
      current.role === 'employer' || isStaffRole(current.role)
        ? current.role
        : seed.role,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [demo, setDemo] = useState(Boolean(getDemoToken()))
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile())

  const refreshProfile = useCallback(async () => {
    const p = rememberProfile(await api<CandidateProfile>('/api/profile'))
    setProfile(p)
    return p
  }, [])

  const syncSocialProfile = useCallback(async (next: User) => {
    try {
      return rememberProfile(
        await api<CandidateProfile>('/api/profile/sync-identity', {
          method: 'POST',
          body: JSON.stringify(identityFromUser(next)),
        }),
      )
    } catch {
      return refreshProfile()
    }
  }, [refreshProfile])

  const establish = useCallback(async (next: User | null) => {
    if (!next) {
      profileInflight = null
      inflightUid = ''
      setUser(null)
      setProfile(emptyProfile())
      return emptyProfile()
    }
    const uid = next.id
    const seed = seedFromUser(next)
    if (seed.role === 'employer' || isStaffRole(seed.role)) rememberLastRole(seed.role)
    setUser(next)
    setProfile((current) => mergeSeed(current, seed))
    if (!profileInflight || inflightUid !== uid) {
      inflightUid = uid
      profileInflight = (async () => {
        try {
          const synced = usesSocialIdentity(next) ? await syncSocialProfile(next) : await refreshProfile()
          setProfile((current) => (current.id === uid ? synced : current))
          return synced
        } catch {
          const fallback = seedFromUser(next)
          setProfile((current) => (current.id === uid ? mergeSeed(current, fallback) : current))
          return fallback
        } finally {
          if (inflightUid === uid) {
            profileInflight = null
            inflightUid = ''
          }
        }
      })()
    }
    return profileInflight
  }, [refreshProfile, syncSocialProfile])

  useEffect(() => {
    let cancelled = false
    const { data } = supabase
      ? supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return
          setAccessToken(session?.access_token ?? null)
          if (event === 'SIGNED_OUT') {
            profileInflight = null
            inflightUid = ''
            setDemoToken(false)
            setDemo(false)
            setProfile(emptyProfile())
            setUser(null)
            void clearServerSession()
            return
          }
          if (session?.access_token) {
            void writeServerSession({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
            })
          }
          if (event === 'TOKEN_REFRESHED') {
            if (session?.user) setUser(session.user)
            return
          }
          if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
            void establish(session.user)
            return
          }
          setUser(session?.user ?? null)
        })
      : { data: { subscription: { unsubscribe() {} } } }

    async function boot() {
      if (getDemoToken()) {
        setDemo(true)
        try {
          const p = await api<CandidateProfile>('/api/profile')
          rememberLastRole(p.role)
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
      if (session.data.session?.user) {
        void writeServerSession({
          accessToken: session.data.session.access_token,
          refreshToken: session.data.session.refresh_token,
        })
        try {
          await establish(session.data.session.user)
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
  }, [establish])

  const ready = !loading && (demo || !user || profileForSession(profile, user, demo))

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      ready,
      user,
      demo,
      profile,
      configured: supabaseConfigured,
      refreshProfile,
      destinationFor: (p = profile) => {
        const role = hintedRole(user, p, profileForSession(p, user, demo))
        if (isStaffRole(role)) return '/admin'
        if (role === 'employer') {
          if (!p.companyName && !p.onboardingCompleted) return '/employer/setup'
          return '/employer'
        }
        return '/app'
      },
      saveProfile: async (patch) => {
        const next = rememberProfile(
          await api<CandidateProfile>('/api/profile', {
            method: 'POST',
            body: JSON.stringify(patch),
          }),
        )
        setProfile(next)
        return next
      },
      signInDemo: async () => {
        setDemoToken(true)
        setDemo(true)
        await writeServerSession({ demo: 'demo' })
        return refreshProfile()
      },
      signInDemoEmployer: async () => {
        setDemoToken('employer')
        setDemo(true)
        await writeServerSession({ demo: 'employer' })
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
        setAccessToken(data.session?.access_token ?? null)
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
        profileInflight = null
        inflightUid = ''
        setDemoToken(false)
        setDemo(false)
        setAccessToken(null)
        setUser(null)
        setProfile(emptyProfile())
        await clearServerSession()
        await supabase?.auth.signOut()
      },
    }),
    [loading, ready, user, demo, profile, refreshProfile, establish],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
