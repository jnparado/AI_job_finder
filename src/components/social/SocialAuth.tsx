import { useState, type ReactElement } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { useAuth } from '@/lib/auth'

const ICONS: { id: Provider; label: string; icon: () => ReactElement }[] = [
  { id: 'facebook', label: 'Facebook', icon: FacebookMark },
  { id: 'google', label: 'Google', icon: GoogleMark },
  { id: 'apple', label: 'Apple', icon: AppleMark },
]

export function SocialAuth({ disabled }: { disabled?: boolean }) {
  const { signInSocial, configured } = useAuth()
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
              disabled={disabled || !configured || Boolean(busy)}
              className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-40"
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
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.7H12Z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="#1877F2" aria-hidden>
      <path d="M14 8h3V4.5h-3c-2.2 0-4 1.8-4 4V11H7v3.5h3V22h3.5v-7.5H17L17.7 11h-3.2V8.5c0-.3.2-.5.5-.5Z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.1 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.4-.9-2.4-3.6ZM14.7 6.2c.6-.8 1.1-1.9.9-3-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-.9 2.9 1.1.1 2.1-.5 2.8-1.4Z" />
    </svg>
  )
}
