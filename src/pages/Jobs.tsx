import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, CircleAlert, ExternalLink, Search } from 'lucide-react'
import type { DiscoverySummary, JobMatch, MatchCategory } from '@shared/types'
import { categoryLabel, sourceLabel } from '@shared/types'
import { api } from '@/lib/api'
import { moneyBand } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { MatchCard } from '@/components/jobs/MatchCard'
import { ScoreBadge } from '@/components/jobs/ScoreBadge'
import { SocialShare } from '@/components/social/SocialLinks'

const FILTERS: { id: MatchCategory | 'all' | '70'; label: string }[] = [
  { id: '70', label: 'Recommended' },
  { id: 'excellent', label: 'Excellent' },
  { id: 'strong', label: 'Strong' },
  { id: 'good', label: 'Good' },
  { id: 'all', label: 'All' },
]

export function JobsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('70')
  const [source, setSource] = useState('all')
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const jobs = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<JobMatch[]>('/api/jobs'),
  })
  const discovery = useQuery({
    queryKey: ['discovery'],
    queryFn: () => api<DiscoverySummary | null>('/api/agent/discovery'),
    enabled: jobs.isSuccess,
  })
  const search = useMutation({
    mutationFn: () =>
      api<{ discovery: DiscoverySummary }>('/api/agent/search', { method: 'POST', body: '{}' }),
    onSuccess: () => {
      void jobs.refetch()
      void discovery.refetch()
    },
  })
  const apply = useMutation({
    mutationFn: (jobId: string) =>
      api<{ id: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      }),
    onSuccess: (row) => navigate(`/app/applications/${row.id}`),
    onSettled: () => setApplyingId(null),
  })
  const report = discovery.data
  const all = jobs.data ?? []
  const sources = [...new Set(all.map((m) => m.job.source))]
  let list = all
  if (filter === '70') list = list.filter((m) => m.score >= 70)
  else if (filter !== 'all') list = list.filter((m) => m.category === filter)
  if (source !== 'all') list = list.filter((m) => m.job.source === source)
  const live = report?.providers?.filter((p) => p.status === 'ok') ?? []
  const recommended = all.filter((m) => m.score >= 70).length
  const excellent = all.filter((m) => m.category === 'excellent').length
  const strong = all.filter((m) => m.category === 'strong').length

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-[var(--forest)] text-[var(--paper)]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Matches</p>
            <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">Jobs scored for you</h1>
            <p className="mt-2 max-w-xl text-sm text-[#d8d0c0]">
              {jobs.isLoading
                ? 'Loading live listings…'
                : recommended
                  ? `${recommended} roles clear your 70% bar.`
                  : 'Search authorized boards and we will score every listing against you.'}
            </p>
          </div>
          <Button variant="copper" onClick={() => search.mutate()} disabled={search.isPending}>
            <Search className="size-4" />
            {search.isPending ? 'Searching…' : 'Search platforms'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#c9c0ae22] sm:grid-cols-4">
          <JobStat n={all.length} label="Scored" />
          <JobStat n={excellent} label="Excellent" />
          <JobStat n={strong} label="Strong" />
          <JobStat n={live.length || sources.length} label="Sources" />
        </div>
        {report?.officialSearch?.length ? (
          <div className="flex flex-wrap items-center gap-2 px-6 py-4 sm:px-8">
            <span className="mr-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#c6a15b]">
              Apply on
            </span>
            {report.officialSearch.map((board) => (
              <a
                key={board.source}
                href={board.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#c9c0ae33] px-3 py-1 text-sm text-[#e7e1d4] hover:border-[#c6a15b]"
              >
                {board.label}
                <ExternalLink className="size-3.5 opacity-70" />
              </a>
            ))}
          </div>
        ) : null}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-full border border-border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                filter === f.id
                  ? 'bg-[var(--forest)] text-[var(--paper)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {sources.length > 1 ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Source
            <select
              className="h-10 rounded-full border border-border bg-card px-3 text-sm text-foreground"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="all">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel(s)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {jobs.isLoading ? (
        <div className="space-y-3">
          <Card className="h-28 animate-pulse bg-muted/60" />
          <Card className="h-28 animate-pulse bg-muted/60" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="Nothing in this view"
          body="Try Recommended, or search again to refresh live listings."
          actionLabel="Search platforms"
          onClick={() => search.mutate()}
        />
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <MatchCard
              key={m.job.id}
              match={m}
              applying={applyingId === m.job.id && apply.isPending}
              onApply={() => {
                setApplyingId(m.job.id)
                apply.mutate(m.job.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function JobStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="bg-[var(--forest-2)] px-4 py-4">
      <div className="font-serif text-2xl tabular-nums sm:text-3xl">{n}</div>
      <div className="mt-1 text-xs text-[#c9c0ae] sm:text-sm">{label}</div>
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
  const atelier = Boolean(m.job.employerId || m.job.source === 'atelier')

  return (
    <div className="space-y-6 pb-24">
      <Link to="/app/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All matches
      </Link>

      <section className="overflow-hidden rounded-3xl border border-border bg-[var(--forest)] text-[var(--paper)]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:p-8">
          <ScoreBadge score={m.score} category={m.category} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">
              {categoryLabel(m.category)}
            </p>
            <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">{m.job.title}</h1>
            <p className="mt-2 text-lg text-[#e7e1d4]">{m.job.company}</p>
            <p className="mt-1 text-sm text-[#c9c0ae]">
              {m.job.remote ? 'Remote' : m.job.location} · {m.job.employmentType ?? 'Full-time'} ·{' '}
              {moneyBand(m.job.salaryMin, m.job.salaryMax, m.job.currency)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#c9c0ae33] px-2.5 py-1 text-xs">
                {sourceLabel(m.job.source)}
              </span>
              {atelier ? (
                <span className="rounded-full border border-[#c6a15b66] px-2.5 py-1 text-xs text-[#c6a15b]">
                  Apply on Atelier
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

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
        <div className="mt-6">
          <SocialShare text={`${m.job.title} at ${m.job.company} — scored on Atelier`} />
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-2">
          <Button variant="copper" onClick={() => apply.mutate()} disabled={apply.isPending}>
            {apply.isPending
              ? 'Preparing…'
              : atelier
                ? 'Apply to employer'
                : `Prepare packet for ${sourceLabel(m.job.source)}`}
          </Button>
          {m.job.applicationUrl?.startsWith('http') ? (
            <Button variant="outline" asChild>
              <a href={m.job.applicationUrl} target="_blank" rel="noreferrer">
                Official listing
              </a>
            </Button>
          ) : null}
          {(m.job.sources ?? [])
            .filter((s) => s.url && s.url !== m.job.applicationUrl)
            .map((s) => (
              <Button key={s.source + s.url} variant="outline" asChild>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {sourceLabel(s.source)}
                </a>
              </Button>
            ))}
        </div>
      </div>
    </div>
  )
}
