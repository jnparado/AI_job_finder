import { useEffect, useState } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { AUTH_PROVIDERS } from '@/lib/social'
import { loadEnabledProviders } from '@/lib/authProviders'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export function SocialAuth({ disabled }: { disabled?: boolean }) {
  const { signInSocial, configured } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [enabled, setEnabled] = useState<Provider[] | null>(null)

  useEffect(() => {
    void loadEnabledProviders().then(setEnabled)
  }, [])

  const live = AUTH_PROVIDERS.filter((p) => enabled?.includes(p.id))

  if (enabled !== null && live.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Social sign-in is ready in the app. Turn on Google, Facebook, and the others in Supabase → Authentication → Providers, then they appear here.
      </p>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Continue with</p>
      <div className="grid grid-cols-2 gap-2">
        {(enabled === null ? AUTH_PROVIDERS : live).map((p) => (
          <Button
            key={p.id}
            type="button"
            variant="outline"
            disabled={disabled || !configured || Boolean(busy)}
            onClick={() => {
              setError('')
              setBusy(p.id)
              void signInSocial(p.id).catch((err) => {
                setBusy(null)
                const raw = err instanceof Error ? err.message : ''
                setError(
                  /not enabled|unsupported|disabled/i.test(raw)
                    ? `${p.label} is not enabled yet in Supabase Auth.`
                    : raw || `Could not open ${p.label}.`,
                )
              })
            }}
          >
            {busy === p.id ? 'Opening…' : p.label}
          </Button>
        ))}
      </div>
      {error ? <p className="rounded-lg bg-[#f6ebe4] px-3 py-2 text-sm text-[#8f4326]">{error}</p> : null}
    </div>
  )
}
