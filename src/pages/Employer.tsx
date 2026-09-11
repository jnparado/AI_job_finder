import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, MessagesSquare } from 'lucide-react'
import type { Job } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { initials, prettyStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HiringEmpty, HiringHero } from '@/components/employer/HiringChrome'
import { PortalHome } from '@/components/employer/PortalHome'
import { JobsDesk } from '@/components/employer/JobsDesk'
import { PostJobWizard } from '@/components/employer/PostJobWizard'
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
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <HiringHero
        kicker="Hiring"
        title="Set up your company"
        description="Candidates will see this name on jobs you post. You can change it later."
        image="employer-studio.jpg"
        imageAlt="Studio hiring desk"
        compact
      />
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
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function EmployerDashboardPage() {
  return <PortalHome />
}

export function EmployerJobsPage() {
  return <JobsDesk />
}

export function EmployerPostJobPage() {
  return <PostJobWizard />
}

export function EmployerInboxPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim().toLowerCase()
  const jobId = params.get('job') ?? ''
  const inbox = useQuery({
    queryKey: ['employer-inbox'],
    queryFn: () => api<InboxRow[]>('/api/employer/applications'),
  })
  const rows = (inbox.data ?? []).filter((a) => {
    if (jobId && a.job?.id !== jobId) return false
    if (!q) return true
    const hay = [a.candidateName, a.candidateEmail, a.candidateHeadline, a.job?.title, ...(a.job?.skills ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
  return (
    <div className="space-y-6">
      <HiringHero
        kicker="Candidates"
        title={q ? `Results for “${params.get('q')}”` : jobId ? 'Applicants for this role' : 'Applicants'}
        description="Packets candidates approved are delivered here. Mark someone hired to open Atelier time tracker. External board jobs still apply on their official sites."
        image="employer-inbox.jpg"
        imageAlt="Employer reviewing approved packets"
        compact
        actions={
          <Button variant="paper" asChild>
            <Link to="/employer/ateliar">Time tracker</Link>
          </Button>
        }
      />
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((a) => (
            <Link key={a.id} to={`/employer/inbox/${a.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-4 transition-colors hover:border-[var(--forest)]">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e8efe8] font-serif text-lg text-[var(--forest)]">
                    {initials(a.candidateName || a.candidateEmail || 'C')}
                  </span>
                  <div className="min-w-0">
                    <Badge>{prettyStatus(a.status)}</Badge>
                    <h2 className="mt-2 text-xl text-[var(--forest)]">{a.candidateName || a.candidateEmail}</h2>
                    <p className="text-sm text-muted-foreground">
                      {a.job?.title}
                      {a.candidateHeadline ? ` · ${a.candidateHeadline}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-[var(--copper)]">Review · message</span>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <HiringEmpty
          title={q || jobId ? 'No matches' : 'Inbox is empty'}
          body={
            q
              ? 'Nothing in your inbox matches that search.'
              : jobId
                ? 'No approved packets for this role yet.'
                : 'When a candidate applies to one of your Atelier jobs and approves the packet, it appears here.'
          }
          actionLabel="Post a job"
          to="/employer/jobs/new"
          image="employer-interview.jpg"
        />
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
      <HiringHero
        kicker={prettyStatus(a.status)}
        title={a.candidateName || a.candidateEmail || 'Candidate'}
        description={[a.job?.title, a.candidateEmail, a.candidateHeadline].filter(Boolean).join(' · ')}
        image="employer-review.jpg"
        imageAlt="Reviewing a candidate packet"
        compact
        actions={
          <Button variant="paper" asChild>
            <Link to={`/employer/messages/${a.id}`}>
              <MessagesSquare className="size-4" />
              Open messages
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2 rounded-full border border-border bg-card p-1">
        {(['letter', 'resume', 'answers'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'ghost'}
            className={tab === t ? '' : 'text-muted-foreground'}
            onClick={() => setTab(t)}
          >
            {t === 'letter' ? 'Cover letter' : t[0].toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>
      {tab === 'letter' ? <Card className="whitespace-pre-wrap text-sm leading-relaxed">{a.packet.coverLetter}</Card> : null}
      {tab === 'resume' ? (
        <Card>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{a.packet.tailoredResume}</pre>
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

export function EmployerCompanyPage() {
  const { profile, saveProfile } = useAuth()
  const [companyName, setCompanyName] = useState(profile.companyName ?? '')
  const [companyWebsite, setCompanyWebsite] = useState(profile.companyWebsite ?? '')
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await saveProfile({
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim(),
      firstName,
      lastName,
    })
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <HiringHero
        kicker="Company"
        title="Company profile"
        description="Candidates see this name on jobs you post."
        image="employer-studio.jpg"
        compact
      />
      <Card>
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
            Save profile
          </Button>
          {saved ? <p className="text-sm text-[#147a48]">Saved.</p> : null}
        </form>
      </Card>
    </div>
  )
}

export function EmployerSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <HiringHero
        kicker="Workspace"
        title="Settings"
        description="Hiring account, pay, and the time tracker. Packets still leave only after the candidate approves."
        compact
      />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Company profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Name and website shown on your jobs.</p>
        </div>
        <Link to="/employer/company" className="text-sm font-medium text-[#147a48]">
          Edit
        </Link>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">Send pay to people hired on Atelier.</p>
        </div>
        <Link to="/employer/finances" className="text-sm font-medium text-[#147a48]">
          Open payments
        </Link>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Contracts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hired roles, hours, and pay on Atelier.</p>
        </div>
        <Link to="/employer/contracts" className="text-sm font-medium text-[#147a48]">
          Open contracts
        </Link>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Time tracker</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hours hired candidates log after you mark them hired.</p>
        </div>
        <Link to="/employer/ateliar" className="text-sm font-medium text-[#147a48]">
          Open tracker
        </Link>
      </Card>
    </div>
  )
}
