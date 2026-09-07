import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/feedback'
import { useAuth } from '@/lib/auth'
import { supabaseConfigured } from '@/lib/supabase'

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
    queryFn: () => api<{ supabase: boolean; openai: boolean }>('/api/health'),
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
          <li>OpenAI: {health.data?.openai ? 'enabled for resume parse' : 'local parser fallback'}</li>
        </ul>
      </Card>
    </div>
  )
}

export function InterviewPage() {
  const jobs = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<{ job: { title: string; company: string }; matchedSkills: string[] }[]>('/api/jobs'),
  })
  const top = jobs.data?.[0]
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Practice"
        title="Interview agent"
        description="Questions are generated from your top match. Use them as a rehearsal, not a script."
      />
      <Card>
        <p className="text-sm text-muted-foreground">
          Practice against your highest current match. Open an application for role-specific questions.
        </p>
        {top ? (
          <>
            <h2 className="mt-4">{top.job.title}</h2>
            <p>{top.job.company}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5">
              <li>Explain your experience with {top.matchedSkills[0] ?? 'your core stack'}.</li>
              <li>How would you design a scalable Node.js API?</li>
              <li>How have you used PostgreSQL?</li>
              <li>Tell us about an AI agent you built — only if it is on your resume.</li>
            </ol>
          </>
        ) : (
          <p className="mt-3">Run the job agent first.</p>
        )}
      </Card>
    </div>
  )
}

export function CareerPage() {
  const q = useQuery({
    queryKey: ['career'],
    queryFn: () =>
      api<{ headline: string; rates: { label: string; rate: number }[]; advice: string[] }>('/api/career'),
  })
  const d = q.data
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Improvement"
        title="Career coach"
        description="Response patterns from roles you actually applied to — not generic advice."
      />
      <Card>
        <p>{d?.headline ?? 'Apply to roles to see response patterns.'}</p>
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
