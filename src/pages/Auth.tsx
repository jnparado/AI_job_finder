import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/ui/feedback'
import { useAuth } from '@/lib/auth'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { emptyProfile } from '@shared/types'

export function LoginPage() {
  const navigate = useNavigate()
  const { signInDemo, signInDemoEmployer, signInEmail, signInGoogle, configured, destinationFor, user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate(destinationFor(), { replace: true })
  }, [loading, user, destinationFor, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const profile = await signInEmail(email, password)
      navigate(destinationFor(profile))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to pick up matches, packets, and follow-ups.">
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button className="w-full" variant="copper" type="submit" disabled={busy || !configured}>
          {busy ? 'Signing in…' : 'Sign in with email'}
        </Button>
      </form>
      <Button
        variant="outline"
        className="mt-3 w-full"
        type="button"
        disabled={busy || !configured}
        onClick={() => void signInGoogle().catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed.'))}
      >
        Continue with Google
      </Button>
      <Divider />
      <Button
        variant="ghost"
        className="w-full"
        type="button"
        onClick={() => {
          void signInDemo().then((p) => navigate(destinationFor(p)))
        }}
      >
        Try the demo as a candidate
      </Button>
      <Button
        variant="ghost"
        className="w-full"
        type="button"
        onClick={() => {
          void signInDemoEmployer().then((p) => navigate(destinationFor(p)))
        }}
      >
        Try the demo as an employer
      </Button>
      {!supabaseConfigured ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Live auth needs Supabase. Demo mode runs the full agent on this machine.
        </p>
      ) : null}
      <p className="mt-6 text-sm">
        New here? <Link to="/register" className="font-medium text-[var(--copper)]">Create an account</Link>
      </p>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signInDemo, signInDemoEmployer, signUpEmail, signInGoogle, configured, destinationFor, user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState<'candidate' | 'employer'>(params.get('role') === 'employer' ? 'employer' : 'candidate')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate(destinationFor(), { replace: true })
  }, [loading, user, destinationFor, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const profile = await signUpEmail(email, password, {
        role,
        companyName: role === 'employer' ? companyName : undefined,
      })
      navigate(destinationFor(profile))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      title={role === 'employer' ? 'Hire on Atelier' : 'Create your account'}
      subtitle={
        role === 'employer'
          ? 'Post jobs. Review packets candidates send you.'
          : 'Six short questions, then the agent starts matching.'
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border border-border p-1">
        <button
          type="button"
          className={`rounded-full py-2 text-sm ${role === 'candidate' ? 'bg-[var(--forest)] text-[var(--paper)]' : ''}`}
          onClick={() => setRole('candidate')}
        >
          I’m looking
        </button>
        <button
          type="button"
          className={`rounded-full py-2 text-sm ${role === 'employer' ? 'bg-[var(--forest)] text-[var(--paper)]' : ''}`}
          onClick={() => setRole('employer')}
        >
          I’m hiring
        </button>
      </div>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </Field>
        {role === 'employer' ? (
          <Field label="Company name">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </Field>
        ) : null}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button className="w-full" variant="copper" type="submit" disabled={busy || !configured}>
          {busy ? 'Creating account…' : role === 'employer' ? 'Create employer account' : 'Register with email'}
        </Button>
      </form>
      <Button
        variant="outline"
        className="mt-3 w-full"
        type="button"
        disabled={busy || !configured}
        onClick={() => void signInGoogle().catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed.'))}
      >
        Continue with Google
      </Button>
      <Divider />
      <Button
        variant="ghost"
        className="w-full"
        type="button"
        onClick={() => {
          void (role === 'employer' ? signInDemoEmployer() : signInDemo()).then((p) => navigate(destinationFor(p)))
        }}
      >
        {role === 'employer' ? 'Skip ahead with a demo employer' : 'Skip ahead with a demo profile'}
      </Button>
      <p className="mt-6 text-sm">
        Already registered? <Link to="/login" className="font-medium text-[var(--copper)]">Sign in</Link>
      </p>
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
    <AuthFrame title="You can sign in now" subtitle="Your account is ready. Use the email and password you just chose.">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Confirmation email is no longer required. After you sign in you will build your career profile.
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
      for (let i = 0; i < 8 && !cancelled; i += 1) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          const profile = await refreshProfile().catch(() => emptyProfile())
          if (!cancelled) navigate(destinationFor(profile), { replace: true })
          return
        }
        await wait(200)
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
      <AuthFrame title="Could not finish sign in" subtitle={error}>
        <Button variant="copper" asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Signing you in" subtitle="One moment while we restore your session.">
      <div className="h-10 w-10 animate-pulse rounded-full border-2 border-primary/30 border-t-primary" />
    </AuthFrame>
  )
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-[var(--forest)] p-10 text-[var(--paper)] lg:flex">
        <Link to="/">
          <BrandMark light />
        </Link>
        <div>
          <h2 className="max-w-[12ch] text-4xl leading-tight">Jobs that fit. Applications you approve.</h2>
          <p className="mt-4 max-w-sm text-[#c9c0ae]">
            The agent searches, scores, and drafts. You stay in the loop on every send.
          </p>
        </div>
      </aside>
      <div className="grid place-items-center px-4 py-10">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <Link to="/" className="mb-6 block lg:hidden">
            <BrandMark />
          </Link>
          <h1 className="text-3xl">{title}</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-[#f6ebe4] px-3 py-2 text-sm text-[#8f4326]">{children}</p>
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
