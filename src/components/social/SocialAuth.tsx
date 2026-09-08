import { useState, type ReactElement } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { useAuth } from '@/lib/auth'

const ICONS: { id: Provider; label: string; icon: () => ReactElement }[] = [
  { id: 'facebook', label: 'Facebook', icon: FacebookMark },
  { id: 'google', label: 'Google', icon: GoogleMark },
  { id: 'apple', label: 'Apple', icon: AppleMark },
]

export function SocialAuth({ disabled }: { disabled?: boolean }) {
  const { signInSocial } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or continue with
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex justify-center gap-3">
        {ICONS.map((p) => {
          const Icon = p.icon
          return (
            <button
              key={p.id}
              type="button"
              aria-label={`Continue with ${p.label}`}
              disabled={disabled || Boolean(busy)}
              className="grid size-11 place-items-center rounded-full border border-border bg-white shadow-sm transition-colors hover:bg-[#f4f6f4] disabled:pointer-events-none"
              onClick={() => {
                setError('')
                setBusy(p.id)
                void signInSocial(p.id).catch((err) => {
                  setBusy(null)
                  const raw = err instanceof Error ? err.message : ''
                  setError(
                    /not enabled|unsupported|disabled|provider/i.test(raw)
                      ? `Turn on ${p.label} in Supabase → Authentication → Providers.`
                      : raw || `Could not open ${p.label}.`,
                  )
                })
              }}
            >
              <Icon />
            </button>
          )
        })}
      </div>
      {busy ? <p className="text-center text-xs text-muted-foreground">Opening {busy}…</p> : null}
      {error ? <p className="rounded-lg bg-[#f6ebe4] px-3 py-2 text-sm text-[#8f4326]">{error}</p> : null}
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-none" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-none" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        fill="#FFFFFF"
        d="M13.4 20.2v-7.3h2.4l.4-2.8h-2.8V8.3c0-.8.2-1.4 1.4-1.4h1.5V4.4c-.3 0-1.1-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2h-2.5v2.8h2.5v7.3h3Z"
      />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-none" aria-hidden>
      <path
        fill="#111111"
        d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.1 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.4-.9-2.4-3.6ZM14.7 6.2c.6-.8 1.1-1.9.9-3-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-.9 2.9 1.1.1 2.1-.5 2.8-1.4Z"
      />
    </svg>
  )
}
