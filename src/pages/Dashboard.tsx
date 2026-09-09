import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { JobMatch } from '@shared/types'
import { displayName } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { greeting, initials, profileCompleteness } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { FeedListing } from '@/components/jobs/FeedListing'

type FeedTab = 'fit' | 'fresh' | 'desk'

export function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<FeedTab>('fit')
  const [remoteOnly, setRemoteOnly] = useState(false)
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
  const applied = (apps.data ?? []).filter((a) => a.status !== 'draft').length
  const name = displayName(profile)
  const first = name.split(' ')[0] || 'there'
  const headline = profile.headline || profile.desiredTitle || profile.currentTitle || 'Candidate'
  const ready = profileCompleteness(profile)
  const resumeOnFile = Boolean(profile.resumeText || profile.parsedProfile)

  const feed = useMemo(() => {
    let list = [...matches]
    if (remoteOnly) list = list.filter((m) => m.job.remote)
    if (tab === 'fit') {
      list = list.filter((m) => m.score >= 70).sort((a, b) => b.score - a.score)
      if (!list.length) list = [...matches].sort((a, b) => b.score - a.score)
    } else if (tab === 'fresh') {
      list = list.sort((a, b) => {
        const at = a.job.postedAt ? new Date(a.job.postedAt).getTime() : 0
        const bt = b.job.postedAt ? new Date(b.job.postedAt).getTime() : 0
        return bt - at
      })
    } else {
      list = list.filter((m) => m.job.source === 'atelier' || m.job.employerId)
    }
    return list.slice(0, 8)
  }, [matches, remoteOnly, tab])

  const tabs: { id: FeedTab; label: string }[] = [
    { id: 'fit', label: 'Best fit' },
    { id: 'fresh', label: 'Just in' },
    { id: 'desk', label: 'Atelier desk' },
  ]

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-8">
      <div className="min-w-0 space-y-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-[var(--paper)]">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--copper)]">
                Studio
              </p>
              <h1 className="mt-1 font-serif text-3xl leading-tight text-[var(--forest)] sm:text-[2.1rem]">
                {greeting()}, {first}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {jobs.isLoading
                  ? 'Scoring live listings against your profile…'
                  : matches.filter((m) => m.score >= 70).length
                    ? `${matches.filter((m) => m.score >= 70).length} roles currently clear a 70% fit. Packets leave only after you approve.`
                    : 'Search authorized boards. We score every listing against you — nothing is sent until you say so.'}
              </p>
            </div>
            <Button variant="copper" onClick={() => search.mutate()} disabled={search.isPending}>
              <Search className="size-4" />
              {search.isPending ? 'Searching…' : 'Score new roles'}
            </Button>
          </div>
          <div className="grid grid-cols-3 border-t border-border text-center">
            <HeroStat n={matches.length} label="Scored" />
            <HeroStat n={matches.filter((m) => m.score >= 70).length} label="Clear 70%" />
            <HeroStat n={applied} label="In motion" />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
          <div className="flex gap-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`border-b-2 px-3 py-2.5 text-sm transition-colors ${
                  tab === item.id
                    ? 'border-[var(--copper)] font-medium text-[var(--forest)]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRemoteOnly((v) => !v)}
            className={`mb-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
              remoteOnly
                ? 'border-[var(--forest)] bg-[var(--forest)] text-[var(--paper)]'
                : 'border-border bg-card text-muted-foreground hover:border-[var(--forest)]'
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            {remoteOnly ? 'Remote only' : 'All locations'}
          </button>
        </div>

        {jobs.isLoading ? (
          <div className="space-y-3">
            <Card className="h-36 animate-pulse bg-muted/60" />
            <Card className="h-36 animate-pulse bg-muted/60" />
          </div>
        ) : feed.length ? (
          <div className="space-y-3">
            {feed.map((m) => (
              <FeedListing
                key={m.job.id}
                match={m}
                applying={apply.isPending && apply.variables === m.job.id}
                onApply={() => apply.mutate(m.job.id)}
              />
            ))}
            <div className="pt-1 text-center">
              <Button variant="link" asChild>
                <Link to="/app/jobs">Open the full match list</Link>
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            title={tab === 'desk' ? 'No Atelier roles yet' : 'No matches in this view'}
            body={
              tab === 'desk'
                ? 'When an employer posts on Atelier, the scored role lands here and the packet can go to their inbox after you approve.'
                : 'Complete your profile, then score authorized boards. You apply to every match — we deliver only to Atelier employers.'
            }
            actionLabel="Score new roles"
            onClick={() => search.mutate()}
          />
        )}
      </div>

      <aside className="mt-8 space-y-4 lg:sticky lg:top-6 lg:mt-0">
        <Card className="space-y-4">
          <div className="flex items-start gap-3">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="size-12 rounded-2xl object-cover" />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--forest)] font-serif text-lg text-[var(--paper)]">
                {initials(name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--forest)]">{name}</p>
              <p className="truncate text-sm text-muted-foreground">{headline}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Match readiness</span>
              <span className="tabular-nums text-muted-foreground">{ready}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[var(--copper)]" style={{ width: `${ready}%` }} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {ready >= 80
                ? 'The matcher has enough to score roles honestly.'
                : 'Add a resume and target title so scores stay fair.'}
            </p>
          </div>
          <Button variant="outline" className="w-full rounded-xl" asChild>
            <Link to="/app/profile">Open your studio</Link>
          </Button>
        </Card>

        <Card className="space-y-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">
            Packet
          </p>
          <RailLine ok={resumeOnFile} label="Resume on file" to="/app/resume" />
          <RailLine ok={Boolean(profile.desiredTitle)} label="Target role set" to="/app/profile" />
          <RailLine ok={applied > 0} label={`${applied} application${applied === 1 ? '' : 's'} in motion`} to="/app/applications" />
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-medium text-[var(--forest)]">How Atelier applies</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We never auto-submit to LinkedIn, Indeed, or Upwork. Atelier employers get the packet in-inbox after you approve.
          </p>
          <Link to="/app/settings" className="text-sm font-medium text-[var(--copper)]">
            Daily search hours
          </Link>
        </Card>
      </aside>
    </div>
  )
}

function HeroStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="px-3 py-3">
      <div className="font-serif text-2xl tabular-nums text-[var(--forest)]">{n}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function RailLine({ ok, label, to }: { ok: boolean; label: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-sm text-foreground/90 hover:text-[var(--copper)]">
      <span className={`size-1.5 rounded-full ${ok ? 'bg-[var(--forest)]' : 'bg-border'}`} />
      {label}
    </Link>
  )
}
