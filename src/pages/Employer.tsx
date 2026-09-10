import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Inbox, MessagesSquare, Plus } from 'lucide-react'
import type { Currency, EmploymentType, Job } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { greeting, initials, moneyBand, prettyStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge, Textarea } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState, PageHeader } from '@/components/ui/feedback'
import { PayCandidate } from '@/pages/Finances'
import { ThreadPanel } from '@/components/messages/ThreadPanel'

interface InboxRow {
  id: string
  status: string
  candidateName?: string
  candidateEmail?: string
  candidateHeadline?: string
  submittedAt?: string
  packet: {
    tailoredResume: string
    coverLetter: string
    answers: { question: string; answer: string }[]
    recruiterMessage: string
  }
  job?: Job
}

export function EmployerSetupPage() {
  const { profile, saveProfile, destinationFor } = useAuth()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState(profile.companyName ?? '')
  const [companyWebsite, setCompanyWebsite] = useState(profile.companyWebsite ?? '')
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)

  if (profile.role !== 'employer') {
    return <Navigate to={destinationFor(profile)} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await saveProfile({
      role: 'employer',
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim(),
      firstName,
      lastName,
      onboardingCompleted: true,
    })
    navigate('/employer/jobs/new', { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <PageHeader kicker="Hiring" title="Set up your company" description="Candidates will see this name on jobs you post." />
      <Card className="mt-6">
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block space-y-1.5">
            <Label>Your name</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First" required />
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last" required />
            </div>
          </label>
          <label className="block space-y-1.5">
            <Label>Company name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <Label>Website (optional)</Label>
            <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
          </label>
          <Button variant="copper" type="submit">
            Open hiring dashboard
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function EmployerDashboardPage() {
  const { profile } = useAuth()
  const jobs = useQuery({ queryKey: ['employer-jobs'], queryFn: () => api<Job[]>('/api/employer/jobs') })
  const inbox = useQuery({
    queryKey: ['employer-inbox'],
    queryFn: () => api<InboxRow[]>('/api/employer/applications'),
  })
  const list = inbox.data ?? []
  const roles = jobs.data ?? []
  const review = list.filter((a) => a.status === 'submitted' || a.status === 'under_review').length
  const interview = list.filter((a) => a.status.includes('interview')).length
  const offers = list.filter((a) => a.status === 'offer' || a.status === 'hired').length
  const company = profile.companyName || 'Your company'
  const latest = list[0]

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border bg-[var(--forest)] text-[var(--paper)]">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#1f3d32] font-serif text-2xl">
              {initials(company)}
            </span>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">
                Employer home
              </p>
              <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">
                {greeting()}, {company}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[#d8d0c0]">
                Post roles on Atelier. When a candidate approves a packet, it lands in your inbox. You can message them from there.
              </p>
            </div>
          </div>
          <Button variant="copper" asChild>
            <Link to="/employer/jobs/new">
              <Plus className="size-4" />
              Post a job
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#c9c0ae22] sm:grid-cols-5">
          <DashStat n={roles.length} label="Open roles" />
          <DashStat n={list.length} label="Received" />
          <DashStat n={review} label="In review" />
          <DashStat n={interview} label="Interview" />
          <DashStat n={offers} label="Hired" />
        </div>
      </section>

      {latest ? (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-muted font-serif text-xl">
            {initials(latest.candidateName || latest.candidateEmail || 'C')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Latest packet</p>
            <h2 className="mt-1 text-2xl">{latest.candidateName || latest.candidateEmail}</h2>
            <p className="mt-1 text-muted-foreground">
              {latest.job?.title} · {prettyStatus(latest.status)}
            </p>
            {latest.candidateHeadline ? <p className="mt-3 text-sm">{latest.candidateHeadline}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="copper" asChild>
                <Link to={`/employer/inbox/${latest.id}`}>
                  <Inbox className="size-4" />
                  Review packet
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/employer/messages/${latest.id}`}>
                  <MessagesSquare className="size-4" />
                  Message
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/employer/inbox">Open inbox</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="Inbox is empty"
          body="Post a job so matched candidates can apply to you on Atelier."
          actionLabel="Post a job"
          to="/employer/jobs/new"
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Roles</p>
              <h2 className="mt-1 text-2xl">Open jobs</h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/employer/jobs">All posts</Link>
            </Button>
          </div>
          {roles.length ? (
            <ul className="mt-4 space-y-3">
              {roles.slice(0, 4).map((job) => (
                <li key={job.id}>
                  <Link to="/employer/jobs" className="block rounded-2xl border border-border px-4 py-3 hover:border-primary">
                    <div className="font-medium">{job.title}</div>
                    <p className="text-sm text-muted-foreground">
                      {job.location || 'Remote'} · {moneyBand(job.salaryMin, job.salaryMax, job.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No roles yet. Publish one to appear in candidate search.</p>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h2 className="mt-1 text-2xl">Applications</h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/employer/inbox">Inbox</Link>
            </Button>
          </div>
          {list.length ? (
            <ul className="mt-4 space-y-3">
              {list.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link to={`/employer/inbox/${a.id}`} className="block rounded-2xl border border-border px-4 py-3 hover:border-primary">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="truncate">{a.candidateName || a.candidateEmail}</strong>
                      <Badge>{prettyStatus(a.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{a.job?.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Waiting for the first approved packet.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function DashStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="bg-[var(--forest-2)] px-4 py-4">
      <div className="font-serif text-2xl tabular-nums sm:text-3xl">{n}</div>
      <div className="mt-1 text-xs text-[#c9c0ae] sm:text-sm">{label}</div>
    </div>
  )
}

export function EmployerJobsPage() {
  const jobs = useQuery({ queryKey: ['employer-jobs'], queryFn: () => api<Job[]>('/api/employer/jobs') })
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Roles"
        title="Job posts"
        description="These listings appear in candidate search and can receive applications on Atelier."
        actions={
          <Button variant="copper" asChild>
            <Link to="/employer/jobs/new">Post a job</Link>
          </Button>
        }
      />
      {jobs.data?.length ? (
        <div className="space-y-3">
          {jobs.data.map((job) => (
            <Card key={job.id}>
              <Badge>Atelier</Badge>
              <h2 className="mt-2 text-xl">{job.title}</h2>
              <p className="text-sm text-muted-foreground">
                {job.location} · {job.employmentType}
                {job.salaryMin ? ` · $${Math.round(job.salaryMin / 1000)}k` : ''}
                {job.salaryMax ? `–$${Math.round(job.salaryMax / 1000)}k` : ''}
              </p>
              <p className="mt-2 line-clamp-3 text-sm">{job.description}</p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No roles yet" body="Post a job so matched candidates can apply to you directly." actionLabel="Post a job" to="/employer/jobs/new" />
      )}
    </div>
  )
}

export function EmployerPostJobPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('Remote worldwide')
  const [remote, setRemote] = useState(true)
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full-time')
  const [salaryMin, setSalaryMin] = useState(80000)
  const [salaryMax, setSalaryMax] = useState(120000)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [skills, setSkills] = useState('React, TypeScript, Node.js')
  const [error, setError] = useState('')
  const company = profile.companyName || 'Your company'
  const ready = title.trim().length > 2 && description.trim().length >= 40

  const post = useMutation({
    mutationFn: () =>
      api<Job>('/api/employer/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          location,
          remote,
          employmentType,
          salaryMin,
          salaryMax,
          currency,
          skills,
        }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employer-jobs'] })
      navigate('/employer/jobs')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not post the job.'),
  })

  return (
    <div className="space-y-6">
      <Link to="/employer/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All posts
      </Link>
      <PageHeader
        kicker="New role"
        title="Post a job"
        description={`Listed as ${company}. Candidates who match will see this in Jobs. When they approve a packet, it lands in your inbox.`}
      />
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (!ready) {
              setError('Add a title and at least 40 characters of description.')
              return
            }
            post.mutate()
          }}
        >
          <label className="block space-y-1.5">
            <Label>Job title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Full Stack Engineer" required />
          </label>
          <label className="block space-y-1.5">
            <Label>Description</Label>
            <Textarea
              className="min-h-40"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What the role does, the stack, and who should apply."
              required
            />
            <p className={`text-xs ${description.trim().length >= 40 ? 'text-muted-foreground' : 'text-[#8f4326]'}`}>
              {description.trim().length}/40 characters minimum
            </p>
          </label>
          <label className="block space-y-1.5">
            <Label>Skills (comma separated)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <Label>Employment</Label>
              <select
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
              >
                {['full-time', 'part-time', 'contract', 'freelance'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <Label>Salary min</Label>
              <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} />
            </label>
            <label className="block space-y-1.5">
              <Label>Salary max</Label>
              <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(Number(e.target.value))} />
            </label>
            <label className="block space-y-1.5">
              <Label>Currency</Label>
              <select
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PHP', 'CHF'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
              Remote
            </label>
          </div>
          {error ? <p className="text-sm text-[#8f4326]">{error}</p> : null}
          <Button variant="copper" type="submit" disabled={post.isPending || !ready}>
            {post.isPending ? 'Publishing…' : 'Publish job'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function EmployerInboxPage() {
  const inbox = useQuery({
    queryKey: ['employer-inbox'],
    queryFn: () => api<InboxRow[]>('/api/employer/applications'),
  })
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Candidates"
        title="Inbox"
        description="Packets candidates approved are delivered here. Mark someone hired to open Atelier time tracker. External board jobs still apply on their official sites."
        actions={
          <Button variant="paper" asChild>
            <Link to="/employer/ateliar">Time tracker</Link>
          </Button>
        }
      />
      {inbox.data?.length ? (
        <div className="space-y-3">
          {inbox.data.map((a) => (
            <Link key={a.id} to={`/employer/inbox/${a.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-3 hover:border-primary">
                <div>
                  <Badge>{prettyStatus(a.status)}</Badge>
                  <h2 className="mt-2 text-xl">{a.candidateName || a.candidateEmail}</h2>
                  <p className="text-sm text-muted-foreground">
                    {a.job?.title} · {a.candidateHeadline}
                  </p>
                </div>
                <span className="text-sm text-[var(--copper)]">Review · message</span>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Inbox is empty" body="When a candidate applies to one of your Atelier jobs and approves the packet, it appears here." />
      )}
    </div>
  )
}

export function EmployerApplicationPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'letter' | 'resume' | 'answers'>('letter')
  const q = useQuery({
    queryKey: ['employer-application', id],
    queryFn: () => api<InboxRow>(`/api/employer/applications/${id}`),
    enabled: Boolean(id),
  })
  const update = useMutation({
    mutationFn: (status: string) =>
      api(`/api/employer/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employer-application', id] })
      void qc.invalidateQueries({ queryKey: ['employer-inbox'] })
    },
  })
  const a = q.data
  if (!a) return <Card className="h-40 animate-pulse bg-muted/60" />

  return (
    <div className="space-y-6">
      <Link to="/employer/inbox" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Inbox
      </Link>
      <section className="overflow-hidden rounded-3xl border border-[#c9c0ae22] bg-[var(--forest)] text-[var(--paper)] shadow-[0_16px_40px_rgba(13,27,22,0.12)]">
        <div className="p-6 sm:p-8">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">
            {prettyStatus(a.status)}
          </p>
          <h1 className="mt-1 font-serif text-3xl leading-tight">{a.candidateName || a.candidateEmail}</h1>
          <p className="mt-2 text-[#d8d0c0]">
            {a.job?.title} · {a.candidateEmail}
          </p>
          {a.candidateHeadline ? <p className="mt-2 text-sm text-[#c9c0ae]">{a.candidateHeadline}</p> : null}
          <Link to={`/employer/messages/${a.id}`} className="mt-4 inline-flex items-center gap-1 text-sm text-[#c6a15b] hover:underline">
            <MessagesSquare className="size-3.5" />
            Open messages
          </Link>
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        {(['letter', 'resume', 'answers'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t === 'letter' ? 'Cover letter' : t[0].toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>
      {tab === 'letter' ? <Card className="whitespace-pre-wrap text-sm leading-relaxed">{a.packet.coverLetter}</Card> : null}
      {tab === 'resume' ? (
        <Card>
          <pre className="whitespace-pre-wrap font-mono text-xs">{a.packet.tailoredResume}</pre>
        </Card>
      ) : null}
      {tab === 'answers' ? (
        <div className="space-y-3">
          {a.packet.answers.map((qa) => (
            <Card key={qa.question}>
              <strong className="text-sm">{qa.question}</strong>
              <p className="mt-2 text-sm leading-relaxed">{qa.answer}</p>
            </Card>
          ))}
        </div>
      ) : null}
      <PayCandidate applicationId={a.id} job={a.job} />
      <Card>
        <Label>Update status</Label>
        <select
          className="mt-2 h-10 w-full max-w-sm rounded-lg border border-input bg-card px-3 text-sm"
          value={a.status}
          onChange={(e) => update.mutate(e.target.value)}
        >
          {['submitted', 'under_review', 'interview', 'offer', 'hired', 'rejected'].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        {a.status === 'hired' || a.status === 'offer' ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Hired candidates can start{' '}
            <Link to="/employer/ateliar" className="font-medium text-[var(--copper)]">
              Atelier time tracker
            </Link>{' '}
            and log hours on this role.
          </p>
        ) : null}
      </Card>
      <ThreadPanel applicationId={a.id} />
    </div>
  )
}
