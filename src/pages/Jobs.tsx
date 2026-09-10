import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, CircleAlert, ExternalLink, MapPin, Search, Wallet } from 'lucide-react'
import type { DiscoverySummary, JobMatch, MatchCategory } from '@shared/types'
import { categoryLabel, sourceLabel } from '@shared/types'
import { api } from '@/lib/api'
import { money, moneyBand } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { MatchCard } from '@/components/jobs/MatchCard'
import { ScoreBadge } from '@/components/jobs/ScoreBadge'
import { SocialShare } from '@/components/social/SocialLinks'
import { ApplyOnPlatforms } from '@/components/jobs/ApplyOnPlatforms'
import { JobCopy } from '@/components/jobs/JobCopy'
import { listingUrl } from '@shared/applyBoards'

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
    staleTime: 30_000,
  })
  const discovery = useQuery({
    queryKey: ['discovery'],
    queryFn: () => api<DiscoverySummary | null>('/api/agent/discovery'),
    enabled: jobs.isSuccess,
    staleTime: 30_000,
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
  const liveOnce = useRef(false)
  useEffect(() => {
    if (!jobs.isSuccess || liveOnce.current) return
    liveOnce.current = true
    const timer = window.setTimeout(() => {
      search.mutate()
    }, 700)
    return () => window.clearTimeout(timer)
    // Refresh live boards once after the fast catalog scores paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.isSuccess])
  const report = discovery.data
  const all = jobs.data ?? []
  const sources = [...new Set(all.map((m) => m.job.source))]
  const recommended = all.filter((m) => m.score >= 70).length
  const excellent = all.filter((m) => m.category === 'excellent').length
  const strong = all.filter((m) => m.category === 'strong').length
  const effectiveFilter = filter === '70' && !jobs.isLoading && recommended === 0 && all.length > 0 ? 'all' : filter
  let list = all
  if (effectiveFilter === '70') list = list.filter((m) => m.score >= 70)
  else if (effectiveFilter !== 'all') list = list.filter((m) => m.category === effectiveFilter)
  if (source !== 'all') list = list.filter((m) => m.job.source === source)
  const live = report?.providers?.filter((p) => p.status === 'ok') ?? []

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-[var(--forest)] text-[var(--paper)]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Matches</p>
            <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">Jobs scored for you</h1>
            <p className="mt-2 max-w-xl text-sm text-[#d8d0c0]">
              {jobs.isLoading
                ? 'Loading scored listings…'
                : search.isPending
                  ? 'Refreshing authorized boards in the background…'
                  : recommended
                    ? `${recommended} roles clear your 70% bar.`
                    : all.length
                      ? `${all.length} roles scored. None clear 70% yet — showing all matches.`
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
        {report?.marketSalary?.yearlyMedian ? (
          <p className="border-t border-[#c9c0ae22] px-6 py-3 text-sm text-[#d8d0c0] sm:px-8">
            Market range for {report.marketSalary.title} in {report.marketSalary.country}:{' '}
            {money(report.marketSalary.yearlyMin, report.marketSalary.currency)}–
            {money(report.marketSalary.yearlyMax, report.marketSalary.currency)}{' '}
            (median {money(report.marketSalary.yearlyMedian, report.marketSalary.currency)})
          </p>
        ) : null}
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

      {jobs.isError ? (
        <EmptyState
          title="Could not load matches"
          body={jobs.error instanceof Error ? jobs.error.message : 'Try again in a moment.'}
          actionLabel="Retry"
          onClick={() => void jobs.refetch()}
        />
      ) : jobs.isLoading ? (
        <div className="space-y-3">
          <Card className="h-28 animate-pulse bg-muted/60" />
          <Card className="h-28 animate-pulse bg-muted/60" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="Nothing in this view"
          body="Try All, or search again to refresh live listings."
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
  const postingUrl = listingUrl(m.job)

  return (
    <div className="space-y-6 pb-28">
      <Link to="/app/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All matches
      </Link>

      <section className="overflow-hidden rounded-3xl border border-[#c9c0ae22] bg-[var(--forest)] text-[var(--paper)] shadow-[0_16px_40px_rgba(13,27,22,0.12)]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:p-8">
          <ScoreBadge score={m.score} category={m.category} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">
              {categoryLabel(m.category)} match
            </p>
            <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">{m.job.title}</h1>
            <p className="mt-2 text-lg text-[#e7e1d4]">{m.job.company}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c9c0ae33] px-2.5 py-1 text-xs text-[#e7e1d4]">
                <MapPin className="size-3.5 opacity-80" />
                {m.job.remote ? 'Remote' : m.job.location || 'Location open'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c9c0ae33] px-2.5 py-1 text-xs text-[#e7e1d4]">
                <Wallet className="size-3.5 opacity-80" />
                {moneyBand(m.job.salaryMin, m.job.salaryMax, m.job.currency)}
              </span>
              <span className="rounded-full border border-[#c9c0ae33] px-2.5 py-1 text-xs text-[#e7e1d4]">
                {m.job.employmentType ?? 'Full-time'}
              </span>
              <span className="rounded-full border border-[#c9c0ae33] px-2.5 py-1 text-xs text-[#e7e1d4]">
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
        <Card className="bg-[#f4f8f5]">
          <h2>Why this fits</h2>
          <ul className="mt-5 space-y-2.5">
            {m.matchedSkills.length ? (
              m.matchedSkills.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                  {s} experience
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">We will show matched skills after the next search.</li>
            )}
            {m.job.remote ? (
              <li className="flex items-start gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                Remote position
              </li>
            ) : null}
          </ul>
        </Card>
        <Card className="bg-[#fbf6f0]">
          <h2>Potential gaps</h2>
          {gaps.length ? (
            <ul className="mt-5 space-y-2.5">
              {gaps.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-800" />
                  {s} is not clearly on your resume
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">No material gaps against the required list.</p>
          )}
          {m.recommendation ? (
            <p className="mt-5 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-relaxed text-foreground/85">
              {m.recommendation}
            </p>
          ) : null}
        </Card>
      </div>

      <Card>
        <h2>Score breakdown</h2>
        <div className="mt-6 space-y-4">
          {Object.entries(m.breakdown).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.25rem_1fr_2.75rem] items-center gap-3 text-sm">
              <span className="text-foreground/80">{BREAKDOWN_LABELS[k] ?? k}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#eef1ee]">
                <div
                  className={`h-full rounded-full ${v >= 80 ? 'bg-[#c6a15b]' : 'bg-[var(--forest)]'}`}
                  style={{ width: `${Math.max(4, Math.min(100, v))}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-muted-foreground">{Math.round(v)}%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2>Job description</h2>
        <div className="mt-5">
          <JobCopy text={m.job.description ?? ''} />
        </div>
        {m.job.skills.length ? (
          <div className="mt-6 border-t border-[#e6ebe7] pt-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--copper)]">Skills on this role</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.job.skills.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-6 border-t border-[#e6ebe7] pt-5">
          <SocialShare text={`${m.job.title} at ${m.job.company} — scored on Atelier`} />
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d7ddd8] bg-[var(--paper)]/92 p-3 backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 rounded-2xl border border-[#d7ddd8] bg-white px-4 py-3 shadow-[0_12px_32px_rgba(19,38,31,0.08)]">
          <Button variant="copper" onClick={() => apply.mutate()} disabled={apply.isPending}>
            {apply.isPending
              ? 'Preparing…'
              : atelier
                ? 'Send to employer'
                : `Prepare packet · apply on ${sourceLabel(m.job.source)}`}
          </Button>
          {postingUrl ? (
            <Button variant="outline" asChild>
              <a href={postingUrl} target="_blank" rel="noreferrer">
                Official listing
              </a>
            </Button>
          ) : null}
          {atelier ? null : <ApplyOnPlatforms job={m.job} compact boardsOnly />}
        </div>
      </div>
    </div>
  )
}
