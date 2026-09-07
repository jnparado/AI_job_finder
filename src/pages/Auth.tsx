import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/ui/feedback'
import { useAuth } from '@/lib/auth'
import { supabase, supabaseConfigured } from '@/lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const { signInDemo, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!supabase) {
      setError('Add your Supabase keys, or continue in demo mode below.')
      return
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    else navigate('/app')
  }

  async function google() {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
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
        <Button className="w-full" type="submit" disabled={!configured}>
          Sign in with email
        </Button>
      </form>
      <Button variant="outline" className="mt-3 w-full" type="button" onClick={() => void google()} disabled={!configured}>
        Continue with Google
      </Button>
      <Divider />
      <Button
        variant="ghost"
        className="w-full"
        type="button"
        onClick={() => {
          signInDemo()
          navigate('/onboarding')
        }}
      >
        Try the demo without an account
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
  const { signInDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!supabase) {
      setError('Configure Supabase, or try the demo.')
      return
    }
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) setError(err.message)
    else navigate('/verify')
  }

  async function google() {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <AuthFrame title="Create your account" subtitle="Six short questions, then the agent starts matching.">
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button className="w-full" type="submit" disabled={!supabaseConfigured}>
          Register with email
        </Button>
      </form>
      <Button variant="outline" className="mt-3 w-full" type="button" onClick={() => void google()} disabled={!supabaseConfigured}>
        Continue with Google
      </Button>
      <Divider />
      <Button
        variant="ghost"
        className="w-full"
        type="button"
        onClick={() => {
          signInDemo()
          navigate('/onboarding')
        }}
      >
        Skip ahead with a demo profile
      </Button>
      <p className="mt-6 text-sm">
        Already registered? <Link to="/login" className="font-medium text-[var(--copper)]">Sign in</Link>
      </p>
    </AuthFrame>
  )
}

export function VerifyPage() {
  return (
    <AuthFrame title="Check your inbox" subtitle="Confirm the link we sent, then you will build your career profile.">
      <p className="text-sm leading-relaxed text-muted-foreground">
        After verification you land in onboarding: basics, career, skills, preferences, salary, and locations.
      </p>
      <Button className="mt-6" asChild>
        <Link to="/login">Back to sign in</Link>
      </Button>
    </AuthFrame>
  )
}

export function CallbackPage() {
  const navigate = useNavigate()
  useEffect(() => {
    const t = window.setTimeout(() => navigate('/app'), 400)
    return () => window.clearTimeout(t)
  }, [navigate])
  return (
    <AuthFrame title="Signing you in" subtitle="One moment while we restore your session.">
      <div className="h-10 w-10 animate-pulse rounded-full border-2 border-primary/30 border-t-primary" />
    </AuthFrame>
  )
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
