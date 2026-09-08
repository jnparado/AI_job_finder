import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import type { JobMatch } from '@shared/types'
import { displayName } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { greeting, initials, moneyBand } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { MatchCard } from '@/components/jobs/MatchCard'
import { ScoreBadge } from '@/components/jobs/ScoreBadge'

export function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const jobs = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<JobMatch[]>('/api/jobs'),
  })
  const apps = useQuery({
    queryKey: ['applications'],
    queryFn: () => api<{ id: string; status: string }[]>('/api/applications'),
  })
  const apply = useMutation({
    mutationFn: (jobId: string) =>
      api<{ id: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      }),
    onSuccess: (row) => navigate(`/app/applications/${row.id}`),
  })
  const search = useMutation({
    mutationFn: () => api('/api/agent/search', { method: 'POST', body: '{}' }),
    onSuccess: () => {
      void jobs.refetch()
    },
  })

  const matches = jobs.data ?? []
  const recommended = matches.filter((m) => m.score >= 70)
  const excellent = matches.filter((m) => m.category === 'excellent').length
  const strong = matches.filter((m) => m.category === 'strong').length
  const good = matches.filter((m) => m.category === 'good').length
  const top = recommended[0] ?? matches[0]
  const applied = (apps.data ?? []).filter((a) => a.status !== 'draft').length
  const name = displayName(profile)
  const first = name.split(' ')[0] || 'there'

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border bg-[var(--forest)] text-[var(--paper)]">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#1f3d32] font-serif text-2xl">
              {initials(name)}
            </span>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">
                Candidate home
              </p>
              <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">
                {greeting()}, {first}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[#d8d0c0]">
                {jobs.isLoading
                  ? 'Loading roles scored against your profile…'
                  : recommended.length
                    ? `${recommended.length} roles currently clear your 70% bar.`
                    : 'Search authorized boards and we will score every listing against you.'}
              </p>
            </div>
          </div>
          <Button variant="copper" onClick={() => search.mutate()} disabled={search.isPending}>
            <Search className="size-4" />
            {search.isPending ? 'Searching…' : 'Find new jobs'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#c9c0ae22] sm:grid-cols-5">
          <DashStat n={matches.length} label="Found" />
          <DashStat n={excellent} label="Excellent" />
          <DashStat n={strong} label="Strong" />
          <DashStat n={good} label="Good" />
          <DashStat n={applied} label="Applied" />
        </div>
      </section>

      {jobs.isLoading ? (
        <Card className="h-40 animate-pulse bg-muted/60" />
      ) : top ? (
        <Card className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <ScoreBadge score={top.score} category={top.category} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Today’s top recommendation</p>
            <h2 className="mt-1 text-2xl sm:text-3xl">{top.job.title}</h2>
            <p className="mt-1 text-muted-foreground">
              {top.job.company} · {top.job.remote ? 'Remote' : top.job.location} ·{' '}
              {moneyBand(top.job.salaryMin, top.job.salaryMax, top.job.currency)}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">{top.recommendation}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => navigate(`/app/jobs/${top.job.id}`)}>See why it fits</Button>
              <Button variant="copper" onClick={() => apply.mutate(top.job.id)} disabled={apply.isPending}>
                {apply.isPending ? 'Preparing…' : top.job.employerId ? 'Send to employer' : 'Prepare & apply'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No matches yet"
          body="Complete your profile, then search. You can apply to every match — on Atelier we deliver the packet; on LinkedIn or Upwork you apply on their site."
          actionLabel="Find jobs now"
          onClick={() => search.mutate()}
        />
      )}

      {matches.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-2xl">Top matches</h2>
            <Button variant="link" className="text-[var(--copper)]" asChild>
              <Link to="/app/jobs">View all jobs</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {matches.slice(0, 5).map((m) => (
              <MatchCard
                key={m.job.id}
                match={m}
                applying={apply.isPending && apply.variables === m.job.id}
                onApply={() => apply.mutate(m.job.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
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
