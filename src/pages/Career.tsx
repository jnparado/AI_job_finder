import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, RefreshCw } from 'lucide-react'
import type { CareerInsights, JobMatch } from '@shared/types'
import { careerInsights } from '@shared/engine/packets'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { prettyStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/feedback'

interface AppRow {
  id: string
  status: string
  jobId: string
}

export function CareerPage() {
  const { profile } = useAuth()
  const jobs = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<JobMatch[]>('/api/jobs'),
  })
  const apps = useQuery({
    queryKey: ['applications'],
    queryFn: () => api<AppRow[]>('/api/applications'),
  })
  const coach = useQuery({
    queryKey: ['career'],
    queryFn: () => api<CareerInsights>('/api/career'),
  })

  const matches = jobs.data ?? []
  const applicationRows = (apps.data ?? []).map((a) => ({
    status: a.status,
    title: matches.find((m) => m.job.id === a.jobId)?.job.title ?? '',
  }))
  const local = careerInsights(applicationRows, profile, matches)
  const d = coach.data ?? local
  const loading = coach.isLoading && !coach.data && jobs.isLoading

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Improvement"
        title="Career coach"
        description="Advice from your profile, scored roles, and packets you actually touched — not a generic script."
        actions={
          <Button variant="outline" className="rounded-xl" disabled={coach.isFetching} onClick={() => void coach.refetch()}>
            <RefreshCw className={`size-4 ${coach.isFetching ? 'animate-spin' : ''}`} />
            {coach.isFetching ? 'Updating…' : 'Refresh coach'}
          </Button>
        }
      />

      {coach.isError ? (
        <Card className="text-sm text-[var(--copper)]">
          Could not reach the coach API. Showing what we can read from your studio instead.
        </Card>
      ) : null}

      {loading ? (
        <Card className="h-48 animate-pulse bg-muted/60" />
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-border bg-[var(--paper)]">
            <div className="p-5 sm:p-6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--copper)]">
                {d.aiLane === 'sol' ? 'GPT-5.6 Sol' : 'Atelier career engine'}
              </p>
              <h2 className="mt-2 font-serif text-2xl leading-tight text-[var(--forest)] sm:text-3xl">
                {d.headline}
              </h2>
              {d.strategy ? (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{d.strategy}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
              <Stat n={`${d.readiness ?? 0}%`} label="Readiness" />
              <Stat n={String(d.matchCount ?? matches.length)} label="Scored roles" />
              <Stat n={String(d.appliedCount ?? apps.data?.length ?? 0)} label="Packets" />
              <Stat n={String(d.interviewCount ?? 0)} label="Interview+" />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            {(d.rates ?? []).map((r) => (
              <Card key={r.label} className="space-y-2">
                <div className="flex items-end justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{r.label}</p>
                  <p className="font-serif text-3xl tabular-nums text-[var(--forest)]">{r.rate}%</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[var(--copper)]" style={{ width: `${Math.min(100, r.rate)}%` }} />
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <h2>Recommended improvements</h2>
              <ol className="mt-4 space-y-3">
                {(d.advice ?? []).map((item, i) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#e8efe8] font-serif text-xs text-[var(--forest)]">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
              {d.gaps?.length ? (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Skills listings still ask for
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.gaps.map((g) => (
                      <span key={g} className="rounded-full bg-[#f6ebe4] px-2.5 py-1 text-xs text-[var(--copper)]">
                        {g}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Do not add these to the packet unless you have a real example.
                  </p>
                </div>
              ) : null}
            </Card>

            <Card className="space-y-3">
              <h2>Next moves</h2>
              <ul className="space-y-2">
                {(d.nextActions ?? []).map((action) => (
                  <li key={action.href + action.label}>
                    <Link
                      to={action.href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm hover:border-[var(--forest)]"
                    >
                      <span>
                        {action.done ? '✓ ' : ''}
                        {action.label}
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
              {d.focusTitle ? (
                <p className="text-sm text-muted-foreground">
                  Current target: <span className="text-foreground">{d.focusTitle}</span>
                </p>
              ) : null}
            </Card>
          </div>

          {apps.data?.length ? (
            <Card>
              <div className="flex items-end justify-between gap-3">
                <h2>Packets in motion</h2>
                <Link to="/app/applications" className="text-sm font-medium text-[var(--copper)]">
                  Open all
                </Link>
              </div>
              <ul className="mt-4 divide-y divide-border">
                {apps.data.slice(0, 6).map((row) => {
                  const title = matches.find((m) => m.job.id === row.jobId)?.job.title || 'Role'
                  return (
                    <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <Link to={`/app/applications/${row.id}`} className="min-w-0 truncate hover:text-[var(--copper)]">
                        {title}
                      </Link>
                      <span className="shrink-0 capitalize text-muted-foreground">{prettyStatus(row.status)}</span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ) : (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                No packets yet. Score a role, prepare the letter, and approve before anything leaves.
              </p>
              <Button variant="copper" asChild>
                <Link to="/app/jobs">See matches</Link>
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="px-4 py-4">
      <div className="font-serif text-2xl tabular-nums text-[var(--forest)]">{n}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
