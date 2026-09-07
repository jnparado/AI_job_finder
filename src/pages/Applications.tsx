import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import type { JobMatch } from '@shared/types'
import { api } from '@/lib/api'
import { prettyStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge } from '@/components/ui/card'
import { Textarea } from '@/components/ui/card'
import { EmptyState, PageHeader } from '@/components/ui/feedback'

interface ApplicationRow {
  id: string
  jobId: string
  status: string
  channel: string
  authorized: boolean
  packet: {
    tailoredResume: string
    coverLetter: string
    answers: { question: string; answer: string }[]
    recruiterMessage: string
    resumeNotes: { confirmed: string[]; unconfirmed: string[] }
    aiLane?: string
  }
  submittedAt?: string
  events: { at: string; label: string; detail: string }[]
  followUps: { dayOffset: number; title: string; body: string; sent: boolean }[]
  recruiterSent: boolean
  match?: JobMatch
  interview?: string[]
  deliveredToEmployer?: boolean
  directToEmployer?: boolean
}

export function ApplicationsPage() {
  const q = useQuery({
    queryKey: ['applications'],
    queryFn: () => api<ApplicationRow[]>('/api/applications'),
  })
  const jobs = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<JobMatch[]>('/api/jobs'),
  })
  const list = q.data ?? []
  const counts = {
    submitted: list.filter((a) => a.status === 'submitted' || a.status === 'under_review').length,
    interview: list.filter((a) => a.status.includes('interview')).length,
    offer: list.filter((a) => a.status === 'offer').length,
    rejected: list.filter((a) => a.status === 'rejected').length,
  }
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Tracker"
        title="Applications"
        description="Every packet stays a draft until you approve it."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={counts.submitted} label="Applied" />
        <Stat n={counts.interview} label="Interview" />
        <Stat n={counts.offer} label="Offer" />
        <Stat n={counts.rejected} label="Closed" />
      </div>
      {list.length === 0 ? (
        <EmptyState
          title="Nothing in flight"
          body="Open a recommended job and choose Apply with AI. You will review the packet before anything is sent."
          actionLabel="Browse matches"
          to="/app/jobs"
        />
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const match = jobs.data?.find((m) => m.job.id === a.jobId)
            return (
              <Link key={a.id} to={`/app/applications/${a.id}`} className="block">
                <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-primary">
                  <div>
                    <Badge>{prettyStatus(a.status)}</Badge>
                    <h2 className="mt-2 text-xl">{match?.job.title ?? 'Application packet'}</h2>
                    <p className="text-sm text-muted-foreground">
                      {match?.job.company ?? a.jobId} · {a.channel}
                    </p>
                  </div>
                  <span className="text-sm text-[var(--copper)]">Open packet</span>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <Card className="py-4">
      <div className="font-serif text-2xl tabular-nums">{n}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  )
}

export function ApplicationDetailsPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'resume' | 'letter' | 'answers' | 'recruiter'>('letter')
  const [authorized, setAuthorized] = useState(false)
  const q = useQuery({
    queryKey: ['application', id],
    queryFn: () => api<ApplicationRow>(`/api/applications/${id}`),
    enabled: Boolean(id),
  })
  const save = useMutation({
    mutationFn: (packet: ApplicationRow['packet']) =>
      api(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ packet }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['application', id] }),
  })
  const status = useMutation({
    mutationFn: (next: string) =>
      api(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['application', id] }),
  })
  const approve = useMutation({
    mutationFn: () =>
      api<{ openUrl?: string; deliveredToEmployer?: boolean }>(`/api/applications/${id}/approve`, { method: 'POST' }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['application', id] })
      if (r.openUrl?.startsWith('http')) window.open(r.openUrl, '_blank')
    },
  })
  const follow = useMutation({
    mutationFn: (index: number) =>
      api(`/api/applications/${id}/follow-up`, { method: 'POST', body: JSON.stringify({ index }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['application', id] }),
  })
  const recruiter = useMutation({
    mutationFn: () => api(`/api/applications/${id}/recruiter`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['application', id] }),
  })

  const a = q.data
  if (!a) return <Card className="h-40 animate-pulse bg-muted/60" />
  const p = a.packet

  function updatePacket(next: ApplicationRow['packet']) {
    save.mutate(next)
  }

  return (
    <div className="space-y-6 pb-8">
      <Link to="/app/applications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All applications
      </Link>
      <div>
        <Badge>{prettyStatus(a.status)}</Badge>
        <h1 className="mt-2 text-3xl sm:text-4xl">{a.match?.job.title ?? 'Application packet'}</h1>
        <p className="mt-1 text-muted-foreground">{a.match?.job.company} · {a.channel}</p>
        {p.aiLane === 'terra' ? (
          <p className="mt-2 text-sm text-muted-foreground">Cover letter and answers drafted by GPT-5.6 Terra. Edit anything before you approve.</p>
        ) : null}
      </div>

      {p.resumeNotes.unconfirmed.length ? (
        <Card>
          <p className="text-sm">
            Next.js / listed skills that appear on your profile are confirmed.
            The agent will <strong>not</strong> invent {p.resumeNotes.unconfirmed.join(', ')}.
          </p>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(['resume', 'letter', 'answers', 'recruiter'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t === 'letter' ? 'Cover letter' : t[0].toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {tab === 'resume' ? (
        <Textarea className="min-h-80 font-mono text-xs" value={p.tailoredResume} onChange={(e) => updatePacket({ ...p, tailoredResume: e.target.value })} />
      ) : null}
      {tab === 'letter' ? (
        <div className="space-y-3">
          <Textarea className="min-h-72" value={p.coverLetter} onChange={(e) => updatePacket({ ...p, coverLetter: e.target.value })} />
        </div>
      ) : null}
      {tab === 'answers' ? (
        <div className="space-y-4">
          {p.answers.map((qa, idx) => (
            <label key={qa.question} className="block space-y-1">
              <span className="text-sm font-medium">{qa.question}</span>
              <Textarea
                value={qa.answer}
                onChange={(e) => {
                  const answers = p.answers.map((item, i) => (i === idx ? { ...item, answer: e.target.value } : item))
                  updatePacket({ ...p, answers })
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
      {tab === 'recruiter' ? (
        <div className="space-y-3">
          <Textarea className="min-h-48" value={p.recruiterMessage} onChange={(e) => updatePacket({ ...p, recruiterMessage: e.target.value })} />
          <Button disabled={a.recruiterSent} onClick={() => recruiter.mutate()}>
            {a.recruiterSent ? 'Message approved & sent' : 'Approve recruiter message'}
          </Button>
        </div>
      ) : null}

      {a.status === 'draft' || a.status === 'ready' ? (
        <Card className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
            {a.directToEmployer
              ? `I approve sending this packet to ${a.match?.job.company ?? 'the employer'} on Atelier.`
              : `I approve this packet. Submit only through ${a.channel}. Do not automate restricted platforms.`}
          </label>
          <Button variant="copper" disabled={!authorized} onClick={() => approve.mutate()}>
            {a.directToEmployer ? 'Send to employer' : 'Approve and submit'}
          </Button>
        </Card>
      ) : (
        <Card>
          <p>
            {a.deliveredToEmployer
              ? 'Sent to the employer on Atelier. They can review your packet in their inbox.'
              : 'Submitted. Track status and send follow-ups only with your approval.'}
          </p>
          <select
            className="mt-3 h-10 rounded-lg border border-input bg-card px-3 text-sm"
            value={a.status}
            onChange={(e) => status.mutate(e.target.value)}
          >
            {['submitted', 'under_review', 'interview', 'technical_interview', 'hr_interview', 'final_interview', 'offer', 'rejected'].map((s) => (
              <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </Card>
      )}

      <section className="space-y-3">
        <h2>Follow-up AI</h2>
        {a.followUps.map((f, i) => (
          <Card key={f.title}>
            <strong>{f.title} · day {f.dayOffset}</strong>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{f.body}</pre>
            <Button className="mt-2" variant="outline" disabled={f.sent || !a.submittedAt} onClick={() => follow.mutate(i)}>
              {f.sent ? 'Sent' : 'Approve & send'}
            </Button>
          </Card>
        ))}
      </section>

      {a.interview?.length ? (
        <Card>
          <h2>Interview agent</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {a.interview.map((qst) => (
              <li key={qst}>{qst}</li>
            ))}
          </ol>
          <Link to="/app/interview" className="mt-3 inline-block text-sm text-[var(--copper)]">
            Open interview workspace
          </Link>
        </Card>
      ) : null}

      <ol className="space-y-2 text-sm">
        {a.events.map((e) => (
          <li key={e.at + e.label}>
            <strong>{e.label}</strong>
            <div className="text-muted-foreground">{e.detail}</div>
          </li>
        ))}
      </ol>
    </div>
  )
}
