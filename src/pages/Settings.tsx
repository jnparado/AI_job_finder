import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/feedback'
import { useAuth } from '@/lib/auth'
import { supabaseConfigured } from '@/lib/supabase'
import { SocialAuth } from '@/components/social/SocialAuth'
import { SocialConnectForm } from '@/components/social/SocialConnectForm'
import { SocialShare } from '@/components/social/SocialLinks'
import type { Currency } from '@shared/types'

interface Settings {
  enabled: boolean
  runHour: number
  minMatch: number
  maxJobs: number
}

export function SettingsPage() {
  const { configured, profile } = useAuth()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['agent-settings'],
    queryFn: () => api<Settings>('/api/agent/settings'),
  })
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () =>
      api<{
        supabase: boolean
        openai: boolean
        discovery?: Record<string, boolean>
        router?: { configured: boolean; luna: string; terra: string; sol: string; traces?: { task: string; lane: string; ok: boolean; ms: number }[] }
      }>('/api/health'),
  })
  const save = useMutation({
    mutationFn: (body: Settings) =>
      api('/api/agent/settings', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agent-settings'] }),
  })
  const s = q.data ?? { enabled: false, runHour: 8, minMatch: 80, maxJobs: 20 }
  const saving = save.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Workspace"
        title="Settings"
        description="The daily agent only notifies you. It never applies without approval."
      />
      {q.isError ? (
        <Card className="text-sm text-[var(--copper)]">
          {q.error instanceof Error ? q.error.message : 'Could not load agent settings. You can still open finances and the tracker.'}
        </Card>
      ) : null}
      <PayFloorCard />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Finances</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pay from Atelier employers, ledger, and withdraw.</p>
        </div>
        <Link to="/app/finances" replace className="text-sm font-medium text-[var(--copper)]">
          Open finances
        </Link>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Atelier time tracker</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Official work clock for hired Atelier roles. Download it for your desk.
          </p>
        </div>
        <Link to="/app/ateliar" replace className="text-sm font-medium text-[var(--copper)]">
          Open tracker
        </Link>
      </Card>
      <Card className="space-y-3">
        <h2>Daily job agent</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => save.mutate({ ...s, enabled: e.target.checked })}
          />
          Automatically search every morning
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <Label>Time (hour)</Label>
            <Input type="number" min={0} max={23} value={s.runHour} onChange={(e) => save.mutate({ ...s, runHour: Number(e.target.value) })} />
          </label>
          <label className="space-y-1">
            <Label>Minimum match</Label>
            <Input type="number" value={s.minMatch} onChange={(e) => save.mutate({ ...s, minMatch: Number(e.target.value) })} />
          </label>
          <label className="space-y-1">
            <Label>Maximum jobs</Label>
            <Input type="number" value={s.maxJobs} onChange={(e) => save.mutate({ ...s, maxJobs: Number(e.target.value) })} />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Schedule is stored for your account. The agent notifies you of matches — it never applies without approval.
          {saving ? ' Saving…' : save.isSuccess ? ' Saved.' : ''}
        </p>
      </Card>
      <Card>
        <h2>Connections</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Frontend Supabase: {configured || supabaseConfigured ? 'configured' : 'missing .env'}</li>
          <li>API Supabase: {health.data?.supabase ? 'connected' : 'demo memory store'}</li>
          <li>OpenAI: {health.data?.openai ? 'router enabled (Luna / Terra / Sol)' : 'local engines until OPENAI_API_KEY is set'}</li>
        </ul>
      </Card>
      <Card>
        <h2>Social profiles</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste your Google, Meta, LinkedIn, and other profile URLs. They save on your Atelier account and can be shared from Jobs.
        </p>
        {profile.identities?.length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {profile.identities.map((i) => (
              <li key={i.provider} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                {i.avatarUrl ? (
                  <img src={i.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-xs uppercase">
                    {i.provider.slice(0, 1)}
                  </span>
                )}
                <span className="capitalize">{i.provider}</span>
                <span className="text-muted-foreground">{i.name || i.email}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <SocialConnectForm />
        <SocialAuth />
        <div className="mt-5">
          <SocialShare />
        </div>
      </Card>
      <Card>
        <h2>Job platforms</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Remotive, Remote OK, Arbeitnow, The Muse, Himalayas, Jobicy, We Work Remotely, and Greenhouse career pages are queried automatically. Google for Jobs comes from JSearch. Bing, Indeed, LinkedIn, Xing, and market salary come from the RapidAPI Jobs API. Indeed, LinkedIn, ZipRecruiter, and Glassdoor also come from JOBS SEARCH API. All three use RAPIDAPI_KEY. Upwork has no public jobs API — search opens on Upwork itself.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Google for Jobs (JSearch): {health.data?.discovery?.jsearch ? 'key present' : 'add RAPIDAPI_KEY and subscribe to JSearch'}</li>
          <li>Bing / Indeed / LinkedIn / Xing: {health.data?.discovery?.jobsApi ? 'Jobs API key present' : 'add RAPIDAPI_KEY and subscribe to jobs-api14'}</li>
          <li>Indeed / LinkedIn / ZipRecruiter / Glassdoor: {health.data?.discovery?.jobsSearch ? 'JOBS SEARCH API key present' : 'add RAPIDAPI_KEY and subscribe to JOBS SEARCH API'}</li>
          <li>Adzuna: {health.data?.discovery?.adzuna ? 'connected' : 'optional ADZUNA_APP_ID / ADZUNA_APP_KEY'}</li>
          <li>USAJOBS: {health.data?.discovery?.usajobs ? 'connected' : 'optional USAJOBS_EMAIL'}</li>
        </ul>
      </Card>
    </div>
  )
}

const PAY_CURRENCIES: Currency[] = ['PHP', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF']

function PayFloorCard() {
  const { profile, saveProfile } = useAuth()
  const [floor, setFloor] = useState(String(profile.salaryMin || 80000))
  const [desired, setDesired] = useState(String(profile.salaryDesired || 120000))
  const [currency, setCurrency] = useState<Currency>('PHP')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFloor(String(profile.salaryMin || 80000))
    setDesired(String(profile.salaryDesired || 120000))
    setCurrency('PHP')
  }, [profile.salaryMin, profile.salaryDesired])

  async function onSave() {
    setNote('')
    setBusy(true)
    try {
      await saveProfile({
        salaryMin: Number(floor) || 0,
        salaryDesired: Number(desired) || 0,
        currency,
      })
      setNote('Pay floor saved.')
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not save pay floor.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2>Pay floor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The matcher respects this peso floor. Change the amount if ₱80,000 is not your real minimum.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1">
          <Label>Currency</Label>
          <select
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {PAY_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <Label>Floor</Label>
          <Input type="number" min={0} step={1000} value={floor} onChange={(e) => setFloor(e.target.value)} />
        </label>
        <label className="space-y-1">
          <Label>Target</Label>
          <Input type="number" min={0} step={1000} value={desired} onChange={(e) => setDesired(e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="copper" disabled={busy} onClick={() => void onSave()}>
          {busy ? 'Saving…' : 'Save pay floor'}
        </Button>
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      </div>
    </Card>
  )
}

export function InterviewPage() {
  const q = useQuery({
    queryKey: ['interview'],
    queryFn: () =>
      api<{
        job: { title: string; company: string } | null
        matchedSkills: string[]
        questions: string[]
        coaching: string[]
        aiLane?: string
      }>('/api/interview'),
  })
  const data = q.data
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Practice"
        title="Interview agent"
        description="GPT-5.6 Sol coaches you against your top match. Use the answers as a rehearsal, not a script."
      />
      <Card>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Preparing questions…</p>
        ) : data?.job ? (
          <>
            <p className="eyebrow">{data.aiLane === 'sol' ? 'GPT-5.6 Sol' : 'Local interview engine'}</p>
            <h2 className="mt-2">{data.job.title}</h2>
            <p>{data.job.company}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5">
              {data.questions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            {data.coaching.length ? (
              <>
                <h2 className="mt-6">How to answer</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                  {data.coaching.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Score a role first, then come back here to rehearse against your top match.
          </p>
        )}
      </Card>
    </div>
  )
}
