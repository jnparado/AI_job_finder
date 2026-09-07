import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import type { Currency, EmploymentType, Job } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { prettyStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge, Textarea } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState, PageHeader } from '@/components/ui/feedback'

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next = await saveProfile({
      role: 'employer',
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim(),
      firstName,
      lastName,
      onboardingCompleted: true,
    })
    navigate(destinationFor(next), { replace: true })
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
  const open = inbox.data?.filter((a) => a.status !== 'rejected' && a.status !== 'offer') ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Employer"
        title={profile.companyName || 'Hiring dashboard'}
        description="Post roles on Atelier. When a candidate approves their packet, it lands in your inbox."
        actions={
          <Button variant="copper" asChild>
            <Link to="/employer/jobs/new">Post a job</Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-4">
          <div className="font-serif text-2xl tabular-nums">{jobs.data?.length ?? 0}</div>
          <div className="text-sm text-muted-foreground">Open roles</div>
        </Card>
        <Card className="py-4">
          <div className="font-serif text-2xl tabular-nums">{inbox.data?.length ?? 0}</div>
          <div className="text-sm text-muted-foreground">Applications received</div>
        </Card>
        <Card className="py-4">
          <div className="font-serif text-2xl tabular-nums">{open.length}</div>
          <div className="text-sm text-muted-foreground">In review</div>
        </Card>
      </div>
      <Card>
        <h2 className="text-lg">Latest applications</h2>
        {(inbox.data ?? []).slice(0, 5).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None yet. Post a job so candidates can apply on Atelier.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(inbox.data ?? []).slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link to={`/employer/inbox/${a.id}`} className="block rounded-xl border border-border px-4 py-3 hover:border-primary">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{a.candidateName || a.candidateEmail}</strong>
                    <Badge>{prettyStatus(a.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.job?.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
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
  const navigate = useNavigate()
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
    onSuccess: () => navigate('/employer/jobs'),
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not post the job.'),
  })

  return (
    <div className="space-y-6">
      <Link to="/employer/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All posts
      </Link>
      <PageHeader kicker="New role" title="Post a job" description="Candidates who match will see this in Jobs. Approving their packet sends it here." />
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            post.mutate()
          }}
        >
          <label className="block space-y-1.5">
            <Label>Job title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <Label>Description</Label>
            <Textarea className="min-h-40" value={description} onChange={(e) => setDescription(e.target.value)} required />
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
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PHP'].map((c) => (
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
          <Button variant="copper" type="submit" disabled={post.isPending}>
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
      <PageHeader kicker="Candidates" title="Inbox" description="Packets candidates approved are delivered here. External board jobs still apply on their official sites." />
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
                <span className="text-sm text-[var(--copper)]">Review packet</span>
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
      <div>
        <Badge>{prettyStatus(a.status)}</Badge>
        <h1 className="mt-2 text-3xl">{a.candidateName || a.candidateEmail}</h1>
        <p className="mt-1 text-muted-foreground">
          {a.job?.title} · {a.candidateEmail}
        </p>
        {a.candidateHeadline ? <p className="mt-1 text-sm">{a.candidateHeadline}</p> : null}
      </div>
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
      <Card>
        <Label>Update status</Label>
        <select
          className="mt-2 h-10 w-full max-w-sm rounded-lg border border-input bg-card px-3 text-sm"
          value={a.status}
          onChange={(e) => update.mutate(e.target.value)}
        >
          {['submitted', 'under_review', 'interview', 'offer', 'rejected'].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </Card>
    </div>
  )
}
