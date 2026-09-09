import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/ui/feedback'
import { useAuth } from '@/lib/auth'
import { rememberIntendedAccount, supabase, takeIntendedAccount, upsertOwnProfile } from '@/lib/supabase'
import { authHero, brandSrc, localBrandPath } from '@/lib/brandAssets'
import { emptyProfile, isStaffRole } from '@shared/types'
import type { CandidateProfile } from '@shared/types'
import { SocialAuth } from '@/components/social/SocialAuth'
import { api } from '@/lib/api'
import { identityFromUser } from '@/lib/identity'
import { CandidateWorkshop } from '@/pages/CandidateWorkshop'

const REMEMBER_KEY = 'atelier-remember-email'

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signInEmail, configured, destinationFor, user, loading } = useAuth()
  const role: 'candidate' | 'employer' = params.get('role') === 'employer' ? 'employer' : 'candidate'
  const hiring = role === 'employer'
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    rememberIntendedAccount(role)
  }, [role])

  useEffect(() => {
    if (!loading && user) navigate(destinationFor(), { replace: true })
  }, [loading, user, destinationFor, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase())
      else localStorage.removeItem(REMEMBER_KEY)
      const profile = await signInEmail(email, password)
      navigate(destinationFor(profile))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame role={role} mode="login">
      <RoleSwitch
        role={role}
        onChange={(next) => navigate(next === 'employer' ? '/login?role=employer' : '/login', { replace: true })}
      />
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            autoComplete="current-password"
            value={password}
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            onChange={setPassword}
          />
        </Field>
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember Me
          </label>
          <Link to={hiring ? '/forgot?role=employer' : '/forgot'} className="font-medium text-[var(--copper)]">
            Forgot Password?
          </Link>
        </div>
        {error ? <ErrorText>{error}</ErrorText> : null}
        {!configured ? (
          <ErrorText>
            Auth is not connected in this build. Locally, keep VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in
            .env (or SUPABASE_URL / SUPABASE_ANON_KEY) and restart npm run dev. On Vercel, add the same keys
            under Settings → Environment Variables for Production, with Build and Runtime enabled, then redeploy.
          </ErrorText>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" type="button" className="rounded-xl" onClick={() => navigate(hiring ? '/employers' : '/')}>
            Cancel
          </Button>
          <Button variant="copper" type="submit" className="rounded-xl" disabled={busy}>
            {busy ? 'Signing in…' : 'Log In'}
          </Button>
        </div>
      </form>
      <SocialAuth disabled={busy} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to={hiring ? '/register?role=employer' : '/register'} className="font-medium text-[var(--copper)]">
          Sign Up
        </Link>
      </p>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const [params] = useSearchParams()
  if (params.get('role') === 'employer') return <EmployerRegisterPage />
  return <CandidateWorkshop />
}

function EmployerRegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signUpEmail, configured, destinationFor, user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState<'candidate' | 'employer'>(params.get('role') === 'employer' ? 'employer' : 'candidate')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    rememberIntendedAccount(role, companyName)
  }, [role, companyName])

  useEffect(() => {
    if (!loading && user) navigate(destinationFor(), { replace: true })
  }, [loading, user, destinationFor, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      rememberIntendedAccount(role, companyName)
      const profile = await signUpEmail(email, password, {
        role,
        companyName: role === 'employer' ? companyName : undefined,
      })
      navigate(role === 'employer' ? '/employer/jobs/new' : destinationFor(profile))
    } catch (err) {
      if (err instanceof Error && (err as Error & { code?: string }).code === 'confirm') {
        navigate('/verify')
        return
      }
      setError(err instanceof Error ? err.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame role={role} mode="register">
      <RoleSwitch
        role={role}
        onChange={(next) => {
          setRole(next)
          navigate(next === 'employer' ? '/register?role=employer' : '/register', { replace: true })
        }}
      />
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            autoComplete="new-password"
            value={password}
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            onChange={setPassword}
          />
        </Field>
        {role === 'employer' ? (
          <Field label="Company name">
            <Input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </Field>
        ) : null}
        {role === 'employer' ? (
          <div className="rounded-2xl border border-[#c6a15b55] bg-[var(--forest)] px-4 py-3 text-sm text-[var(--paper)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Employer offer</p>
            <p className="mt-1 font-medium">Hiring is free for 1 year.</p>
            <p className="mt-1 text-[#d8d0c0]">
              Unlimited roles and inbox for your first year. After that, billing is yearly — there is no monthly plan.
            </p>
          </div>
        ) : null}
        {error ? <ErrorText>{error}</ErrorText> : null}
        {!configured ? (
          <ErrorText>
            Auth is not connected in this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or the
            matching SUPABASE_ keys) locally, then restart. On Vercel, set them for Production with Build
            enabled and redeploy.
          </ErrorText>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" type="button" className="rounded-xl" onClick={() => navigate(role === 'employer' ? '/employers' : '/')}>
            Cancel
          </Button>
          <Button variant="copper" type="submit" className="rounded-xl" disabled={busy}>
            {busy ? 'Creating…' : 'Sign Up'}
          </Button>
        </div>
      </form>
      <SocialAuth disabled={busy} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={role === 'employer' ? '/login?role=employer' : '/login'} className="font-medium text-[var(--copper)]">
          Sign In
        </Link>
      </p>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const hiring = params.get('role') === 'employer'
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      role={hiring ? 'employer' : 'candidate'}
      mode="login"
      title="Forgot password"
      subtitle="Enter your email and Supabase will send a reset link."
    >
      {sent ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          If that account exists, a reset email is on the way. Open it, then choose a new password.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <Field label="Email">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" type="button" className="rounded-xl" onClick={() => navigate(hiring ? '/login?role=employer' : '/login')}>
              Cancel
            </Button>
            <Button variant="copper" type="submit" className="rounded-xl" disabled={busy}>
              {busy ? 'Sending…' : 'Send link'}
            </Button>
          </div>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link to={hiring ? '/login?role=employer' : '/login'} className="font-medium text-[var(--copper)]">
          Sign In
        </Link>
      </p>
    </AuthFrame>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { updatePassword, destinationFor, user } = useAuth()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await updatePassword(password)
      navigate(destinationFor(), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame role="candidate" mode="login" title="Set a new password" subtitle="Choose a password with at least 8 characters.">
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <Field label="Password">
          <PasswordInput
            autoComplete="new-password"
            value={password}
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            onChange={setPassword}
          />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" type="button" className="rounded-xl" onClick={() => navigate(user ? destinationFor() : '/login')}>
            Cancel
          </Button>
          <Button variant="copper" type="submit" className="rounded-xl" disabled={busy || password.length < 8}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </AuthFrame>
  )
}

export function VerifyPage() {
  const navigate = useNavigate()
  const { user, loading, destinationFor } = useAuth()
  useEffect(() => {
    if (!loading && user) navigate(destinationFor(), { replace: true })
  }, [loading, user, destinationFor, navigate])
  return (
    <AuthFrame role="candidate" mode="login" title="Confirm your email" subtitle="We sent a confirmation link to the address you used.">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Open the email, confirm the account, then sign in. If your project has email confirmation turned off, you can sign in right away.
      </p>
      <Button className="mt-6" variant="copper" asChild>
        <Link to="/login">Continue to sign in</Link>
      </Button>
    </AuthFrame>
  )
}

export function CallbackPage() {
  const navigate = useNavigate()
  const { destinationFor, refreshProfile } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function finish() {
      if (!supabase) {
        navigate('/login', { replace: true })
        return
      }
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = params.get('code')
      const authError = params.get('error_description') || hash.get('error_description')
      const recovery = params.get('type') === 'recovery' || hash.get('type') === 'recovery'
      if (authError) {
        setError(authError)
        return
      }
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && !/already|session/i.test(exchangeError.message)) {
          setError(exchangeError.message)
          return
        }
      }
      for (let i = 0; i < 16 && !cancelled; i += 1) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          const intended = takeIntendedAccount()
          const metaRole: 'candidate' | 'employer' =
            data.session.user.user_metadata?.role === 'employer' ? 'employer' : intended.role
          const companyName = String(data.session.user.user_metadata?.company_name ?? intended.companyName ?? '')
          await upsertOwnProfile({
            id: data.session.user.id,
            email: data.session.user.email ?? '',
            role: metaRole,
            companyName,
          })
          let profile = emptyProfile()
          try {
            profile = data.session.user.identities?.length
              ? await api<CandidateProfile>('/api/profile/sync-identity', {
                  method: 'POST',
                  body: JSON.stringify(identityFromUser(data.session.user)),
                })
              : await refreshProfile()
            if (metaRole === 'employer' && profile.role !== 'employer' && !isStaffRole(profile.role) && !profile.onboardingCompleted) {
              profile = await api<CandidateProfile>('/api/profile', {
                method: 'POST',
                body: JSON.stringify({
                  role: 'employer',
                  companyName: companyName || profile.companyName,
                  onboardingCompleted: true,
                }),
              })
            }
          } catch {
            profile = await refreshProfile().catch(() => ({
              ...emptyProfile(),
              email: data.session.user.email ?? '',
              role: metaRole,
              companyName,
              onboardingCompleted: metaRole === 'employer',
            }))
          }
          if (!cancelled) navigate(recovery ? '/auth/reset' : destinationFor(profile), { replace: true })
          return
        }
        await wait(250)
      }
      if (!cancelled) navigate('/login', { replace: true })
    }
    void finish()
    return () => {
      cancelled = true
    }
  }, [destinationFor, navigate, refreshProfile])

  if (error) {
    return (
      <AuthFrame role="candidate" mode="login" title="Could not finish sign in" subtitle={error}>
        <Button variant="copper" asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame role="candidate" mode="login" title="Signing you in" subtitle="One moment while we restore your session.">
      <div className="h-10 w-10 animate-pulse rounded-full border-2 border-primary/30 border-t-primary" />
    </AuthFrame>
  )
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function RoleSwitch({
  role,
  onChange,
}: {
  role: 'candidate' | 'employer'
  onChange: (role: 'candidate' | 'employer') => void
}) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-border p-1">
      <button
        type="button"
        className={`rounded-full py-2 text-sm ${role === 'candidate' ? 'bg-[var(--forest)] text-[var(--paper)]' : 'text-muted-foreground'}`}
        onClick={() => onChange('candidate')}
      >
        Candidate
      </button>
      <button
        type="button"
        className={`rounded-full py-2 text-sm ${role === 'employer' ? 'bg-[var(--forest)] text-[var(--paper)]' : 'text-muted-foreground'}`}
        onClick={() => onChange('employer')}
      >
        Employer
      </button>
    </div>
  )
}

function PasswordInput({
  value,
  show,
  onToggle,
  onChange,
  autoComplete,
}: {
  value: string
  show: boolean
  onToggle: () => void
  onChange: (value: string) => void
  autoComplete: string
}) {
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder="Password"
        minLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
        required
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function AuthFrame({
  role,
  mode,
  title,
  subtitle,
  children,
}: {
  role: 'candidate' | 'employer'
  mode: 'login' | 'register'
  title?: string
  subtitle?: string
  children: ReactNode
}) {
  const hiring = role === 'employer'
  const heading =
    title ??
    (mode === 'login'
      ? hiring
        ? 'Employer sign in'
        : 'Candidate sign in'
      : hiring
        ? 'Create an employer account'
        : 'Create a candidate account')
  const lead =
    subtitle ??
    (hiring
      ? 'Post roles and review packets that candidates approved.'
      : 'Match authorized jobs, prepare a packet, and send only when you say so.')
  const hero = authHero(role, mode)

  return (
    <div className="grid min-h-svh bg-[#eef1ee] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src={brandSrc(hero.file)}
          alt={hero.alt}
          onError={(e) => {
            e.currentTarget.src = localBrandPath(hero.file)
          }}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a100e]/85 via-[#0a100e]/45 to-[#0a100e]/90" />
        <div className="relative flex h-full flex-col justify-between p-10 text-[var(--paper)]">
          <Link
            to={hiring ? '/employers' : '/'}
            className="inline-flex w-fit rounded-2xl bg-[#0a100e]/70 px-3 py-2.5 ring-1 ring-[#c6a15b44] backdrop-blur-md"
          >
            <BrandMark light />
          </Link>
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c6a15b]">
              {hiring ? 'Atelier · Employers' : 'Atelier · Applicants'}
            </p>
            <h2 className="mt-4 max-w-[12ch] text-4xl leading-tight">
              {hiring ? 'Hire people who actually fit.' : 'Find the jobs that actually fit you.'}
            </h2>
            <p className="mt-4 max-w-sm text-[#d8d0c0]">
              {hiring
                ? 'Publish a role. Meet people who sent a packet on purpose.'
                : 'The agent searches, scores, and drafts. You approve every send.'}
            </p>
          </div>
        </div>
      </aside>
      <div className="grid place-items-center px-4 py-10">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <Link to={hiring ? '/employers' : '/'} className="mb-6 inline-flex lg:hidden">
            <BrandMark />
          </Link>
          <h1 className="text-3xl">{heading}</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">{lead}</p>
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 text-left">
      <Label className="normal-case tracking-normal">{label}</Label>
      {children}
    </div>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-[#f6ebe4] px-3 py-2 text-sm text-[#8f4326]">{children}</p>
}

