import { useState } from 'react'
import { SOCIAL_LINK_FIELDS } from '@/lib/social'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SocialConnectForm() {
  const { profile, saveProfile } = useAuth()
  const [links, setLinks] = useState<Record<string, string>>(profile.socialLinks ?? {})
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        setBusy(true)
        setSaved('')
        const clean = Object.fromEntries(
          Object.entries(links)
            .map(([k, v]) => [k, v.trim()])
            .filter(([, v]) => v),
        )
        void saveProfile({ socialLinks: clean })
          .then(() => setSaved('Saved. Your profiles are connected on Atelier.'))
          .catch((err) => setSaved(err instanceof Error ? err.message : 'Could not save.'))
          .finally(() => setBusy(false))
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_LINK_FIELDS.map((field) => (
          <label key={field.id} className="space-y-1.5">
            <Label>{field.label}</Label>
            <Input
              type="url"
              placeholder={field.placeholder}
              value={links[field.id] ?? ''}
              onChange={(e) => setLinks((cur) => ({ ...cur, [field.id]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <Button type="submit" variant="copper" disabled={busy}>
        {busy ? 'Saving…' : 'Save social profiles'}
      </Button>
      {saved ? <p className="text-sm text-muted-foreground">{saved}</p> : null}
    </form>
  )
}
