import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/feedback'
import { useAuth } from '@/lib/auth'
import { supabaseConfigured } from '@/lib/supabase'
import { RouterDiagram } from '@/components/ai/RouterDiagram'

interface Settings {
  enabled: boolean
  runHour: number
  minMatch: number
  maxJobs: number
}

export function SettingsPage() {
  const { configured } = useAuth()
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
  const s = q.data
  if (!s) return <p>Loading…</p>

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Workspace"
        title="Settings"
        description="The daily agent only notifies you. It never applies without approval."
      />
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
          Schedule is stored for your account. Wire a cron/queue (BullMQ, n8n, or Supabase scheduled
          function) to call <code>POST /api/agent/search</code> at the chosen hour.
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
        <h2>AI router</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {health.data?.router?.configured
            ? `Luna ${health.data.router.luna} · Terra ${health.data.router.terra} · Sol ${health.data.router.sol}`
            : 'Add OPENAI_API_KEY to .env. Until then, parsing, matching, and writing stay on the local engines.'}
        </p>
        <div className="mt-5">
          <RouterDiagram />
        </div>
        {health.data?.router?.traces?.length ? (
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {health.data.router.traces.slice(0, 6).map((t, i) => (
              <li key={`${t.task}-${i}`}>
                {t.lane} · {t.task} · {t.ok ? `${t.ms}ms` : 'fallback'}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
      <Card>
        <h2>Job platforms</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Remotive, Remote OK, Arbeitnow, The Muse, Himalayas, Jobicy, We Work Remotely, and Greenhouse career pages are queried automatically. LinkedIn, Indeed, and Glassdoor need a RapidAPI JSearch key. Upwork has no public jobs API — search opens on Upwork itself.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>LinkedIn / Indeed ingest: {health.data?.discovery?.jsearch ? 'JSearch key present' : 'add RAPIDAPI_KEY to .env'}</li>
          <li>Adzuna: {health.data?.discovery?.adzuna ? 'connected' : 'optional ADZUNA_APP_ID / ADZUNA_APP_KEY'}</li>
          <li>USAJOBS: {health.data?.discovery?.usajobs ? 'connected' : 'optional USAJOBS_EMAIL'}</li>
        </ul>
      </Card>
    </div>
  )
}

export function InterviewPage() {
  const q = useQuery({
    queryKey: ['interview'],
    queryFn: () =>
      api<{
        job: { title: string; company: string }
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
        ) : data ? (
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
          <p className="text-sm text-muted-foreground">Run the job agent first, then come back to rehearse.</p>
        )}
      </Card>
    </div>
  )
}

export function CareerPage() {
  const q = useQuery({
    queryKey: ['career'],
    queryFn: () =>
      api<{
        headline: string
        rates: { label: string; rate: number }[]
        advice: string[]
        strategy?: string
        aiLane?: string
      }>('/api/career'),
  })
  const d = q.data
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Improvement"
        title="Career coach"
        description="GPT-5.6 Sol reads response patterns from roles you actually applied to — not generic advice."
      />
      <Card>
        <p className="eyebrow">{d?.aiLane === 'sol' ? 'GPT-5.6 Sol' : 'Local career engine'}</p>
        <p className="mt-2">{d?.headline ?? 'Apply to roles to see response patterns.'}</p>
        {d?.strategy ? <p className="mt-3 text-sm leading-relaxed">{d.strategy}</p> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {d?.rates.map((r) => (
            <div key={r.label} className="border border-border p-3">
              <div className="font-serif text-2xl">{r.rate}%</div>
              <div className="text-sm text-muted-foreground">{r.label}</div>
            </div>
          ))}
        </div>
        <h2 className="mt-6">Recommended improvements</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {d?.advice.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
