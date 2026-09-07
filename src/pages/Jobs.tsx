import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, CircleAlert } from 'lucide-react'
import type { JobMatch, MatchCategory } from '@shared/types'
import { categoryLabel } from '@shared/types'
import { api } from '@/lib/api'
import { moneyBand } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge } from '@/components/ui/card'
import { EmptyState, PageHeader } from '@/components/ui/feedback'
import { MatchCard } from '@/components/jobs/MatchCard'
import { ScoreBadge } from '@/components/jobs/ScoreBadge'

const FILTERS: { id: MatchCategory | 'all' | '70'; label: string }[] = [
  { id: '70', label: 'Recommended' },
  { id: 'excellent', label: 'Excellent' },
  { id: 'strong', label: 'Strong' },
  { id: 'good', label: 'Good' },
  { id: 'all', label: 'All scored' },
]

export function JobsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('70')
  const jobs = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<JobMatch[]>('/api/jobs'),
  })
  const search = useMutation({
    mutationFn: () => api('/api/agent/search', { method: 'POST', body: '{}' }),
    onSuccess: () => void jobs.refetch(),
  })
  let list = jobs.data ?? []
  if (filter === '70') list = list.filter((m) => m.score >= 70)
  else if (filter !== 'all') list = list.filter((m) => m.category === filter)

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Job discovery"
        title="Matches"
        description="Roles are scored against your profile. Recommended means 70% or higher."
        actions={
          <Button variant="copper" onClick={() => search.mutate()} disabled={search.isPending}>
            {search.isPending ? 'Searching…' : 'Search again'}
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${filter === f.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {jobs.isLoading ? (
        <Card className="h-32 animate-pulse bg-muted/60" />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nothing in this view"
          body="Try Recommended, or search again to refresh authorized listings."
          actionLabel="Search authorized sources"
          onClick={() => search.mutate()}
        />
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <MatchCard key={m.job.id} match={m} />
          ))}
        </div>
      )}
    </div>
  )
}

const BREAKDOWN_LABELS: Record<string, string> = {
  skills: 'Skills',
  experience: 'Experience',
  title: 'Job title',
  salary: 'Salary',
  location: 'Location',
  employment: 'Employment',
  seniority: 'Seniority',
  careerGoals: 'Career goals',
}

export function JobDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['job', id],
    queryFn: () => api<JobMatch>(`/api/jobs/${id}`),
    enabled: Boolean(id),
  })
  const apply = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId: id }),
      }),
    onSuccess: (row) => navigate(`/app/applications/${row.id}`),
  })
  const m = q.data
  if (q.isLoading) return <Card className="h-48 animate-pulse bg-muted/60" />
  if (!m) {
    return (
      <EmptyState
        title="Job not found"
        body="Run the job agent from the dashboard, then open a match from the list."
        actionLabel="Back to jobs"
        to="/app/jobs"
      />
    )
  }

  const gaps = [...m.missingSkills, ...m.preferredMissing]

  return (
    <div className="space-y-6 pb-24">
      <Link to="/app/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All matches
      </Link>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <ScoreBadge score={m.score} category={m.category} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{categoryLabel(m.category)}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">{m.job.title}</h1>
          <p className="mt-2 text-lg">{m.job.company}</p>
          <p className="mt-1 text-muted-foreground">
            {m.job.remote ? 'Remote' : m.job.location} · {m.job.employmentType ?? 'Full-time'} ·{' '}
            {moneyBand(m.job.salaryMin, m.job.salaryMax, m.job.currency)}
          </p>
          {m.job.sources && m.job.sources.length > 1 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Listed on {m.job.sources.map((s) => s.source).join(', ')} — stored as one job.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2>Why this fits</h2>
          <ul className="mt-4 space-y-2">
            {m.matchedSkills.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                {s} experience
              </li>
            ))}
            {m.job.remote ? (
              <li className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                Remote position
              </li>
            ) : null}
          </ul>
        </Card>
        <Card>
          <h2>Potential gaps</h2>
          {gaps.length ? (
            <ul className="mt-4 space-y-2">
              {gaps.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-800" />
                  {s} is not clearly on your resume
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No material gaps against the required list.</p>
          )}
          <p className="mt-4 text-sm leading-relaxed">{m.recommendation}</p>
        </Card>
      </div>

      <Card>
        <h2>Score breakdown</h2>
        <div className="mt-5 space-y-3">
          {Object.entries(m.breakdown).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span>{BREAKDOWN_LABELS[k] ?? k}</span>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
              </div>
              <span className="tabular-nums text-muted-foreground">{Math.round(v)}%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2>Job description</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{m.job.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {m.job.skills.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-2">
          <Button variant="copper" onClick={() => apply.mutate()} disabled={apply.isPending}>
            {apply.isPending ? 'Preparing…' : 'Apply with AI'}
          </Button>
          <Button variant="outline" asChild>
            <a href={m.job.applicationUrl} target="_blank" rel="noreferrer">
              Official listing
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
