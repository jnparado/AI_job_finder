import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  FileText,
  LineChart,
  MapPin,
  MessageSquare,
  ScrollText,
  Search,
  Sparkles,
  Timer,
} from 'lucide-react'
import type { JobMatch } from '@shared/types'
import { displayName, isStaffRole } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, initials, prettyStatus, profileCompleteness } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FeedListing } from '@/components/jobs/FeedListing'
import { prefetchRoute } from '@/lib/prefetch'

type FeedSort = 'recent' | 'fit'

interface AppRow {
  id: string
  status: string
  jobId: string
  createdAt?: string
}

interface CandidateHome {
  matches: JobMatch[]
  applications: AppRow[]
  threadCount: number
}

const REVIEW = new Set([
  'submitted',
  'under_review',
  'interview',
  'technical_interview',
  'hr_interview',
  'final_interview',
])

export function DashboardPage() {
  const { profile, destinationFor } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [sort, setSort] = useState<FeedSort>('fit')
  const [prompt, setPrompt] = useState('')
  const candidateDesk = profile.role !== 'employer' && !isStaffRole(profile.role)

  const home = useQuery({
    queryKey: ['candidate-home'],
    queryFn: async () => {
      const data = await api<CandidateHome>('/api/candidate/home')
      qc.setQueryData(['jobs'], data.matches)
      qc.setQueryData(['applications'], data.applications)
      return data
    },
    staleTime: 30_000,
    enabled: candidateDesk,
  })
  const apply = useMutation({
    mutationFn: (jobId: string) =>
      api<{ id: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ['candidate-home'] })
      void qc.invalidateQueries({ queryKey: ['applications'] })
      navigate(`/app/applications/${row.id}`)
    },
  })
  const search = useMutation({
    mutationFn: () => api('/api/agent/search', { method: 'POST', body: '{}' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['candidate-home'] })
      void qc.invalidateQueries({ queryKey: ['jobs'] })
      navigate('/app/jobs', { replace: true })
    },
  })

  const matches = home.data?.matches ?? []
  const packets = home.data?.applications ?? []
  const threadCount = home.data?.threadCount ?? 0
  const name = displayName(profile)
  const headline = profile.headline || profile.desiredTitle || profile.currentTitle || 'Candidate'
  const place = [profile.city, profile.country].filter(Boolean).join(', ')
  const ready = profileCompleteness(profile)
  const steps = [
    Boolean(profile.resumeText || profile.parsedProfile),
    Boolean(profile.desiredTitle || profile.currentTitle),
    profile.skills.length >= 4,
  ]
  const stepCount = steps.filter(Boolean).length
  const sent = packets.filter((a) => a.status !== 'draft')
  const inReview = packets.filter((a) => REVIEW.has(a.status))
  const hired = packets.filter((a) => a.status === 'offer' || a.status === 'hired')
  const latestPacket = packets[0]
  const latestTitle = latestPacket
    ? matches.find((m) => m.job.id === latestPacket.jobId)?.job.title || 'Packet in studio'
    : null
  const nextMatch = [...matches].sort((a, b) => b.score - a.score)[0]
  const atelierReady = ready >= 70 && Boolean(profile.resumeText || profile.parsedProfile)

  const feed = useMemo(() => {
    const list = [...matches]
    if (sort === 'fit') list.sort((a, b) => b.score - a.score)
    else {
      list.sort((a, b) => {
        const at = a.job.postedAt ? new Date(a.job.postedAt).getTime() : 0
        const bt = b.job.postedAt ? new Date(b.job.postedAt).getTime() : 0
        return bt - at
      })
    }
    return list.slice(0, 5)
  }, [matches, sort])

  if (!candidateDesk) return <Navigate to={destinationFor(profile)} replace />

  function onComposer(e: FormEvent) {
    e.preventDefault()
    void search.mutate()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[16.5rem_minmax(0,1fr)_17.5rem] lg:items-start">
      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="overflow-hidden p-0 shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
          <div className="bg-[var(--forest)] px-5 pb-10 pt-5 text-[var(--paper)]">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Studio</p>
          </div>
          <div className="-mt-8 px-5 pb-5">
            <div className="flex justify-center">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="size-16 rounded-full object-cover ring-4 ring-[var(--paper)]"
                />
              ) : (
                <span className="grid size-16 place-items-center rounded-full bg-[#1f3d32] font-serif text-xl text-[var(--paper)] ring-4 ring-[var(--paper)]">
                  {initials(name)}
                </span>
              )}
            </div>
            <div className="mt-3 text-center">
              <p className="font-serif text-xl text-[var(--forest)]">{name}</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {headline}
                {profile.yearsExperience ? ` · ${profile.yearsExperience} yrs` : ''}
              </p>
              {place ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {place}
                </p>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-[#eef3f0] py-3 text-center">
              <MiniStat n={sent.length} label="Packets" />
              <MiniStat n={threadCount} label="Threads" />
              <MiniStat n={matches.filter((m) => m.score >= 70).length} label="70%+ fits" />
            </div>
          </div>
        </Card>

        <Card className="space-y-1 p-3 shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
          <SideLink to="/app/jobs" icon={Briefcase} label="Scored roles" />
          <SideLink to="/app/applications" icon={FileText} label="My packets" />
          <SideLink to="/app/messages" icon={MessageSquare} label="Messages" />
          <SideLink to="/app/resume" icon={ScrollText} label="Resume" />
          <SideLink to="/app/ateliar" icon={Timer} label="Time tracker" />
        </Card>

        <Card className="space-y-3 shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Profile strength
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[var(--forest)]" style={{ width: `${ready}%` }} />
          </div>
          <p className="text-sm text-[var(--forest)]">
            {stepCount}/3 steps — {atelierReady ? 'ready to prepare packets' : 'finish the basics first'}
          </p>
          <p className="text-xs text-muted-foreground">Resume, target title, and four skills you can defend.</p>
        </Card>
      </aside>

      <div className="min-w-0 space-y-4">
        <Card className="shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">
                Pipeline
              </p>
              <h2 className="mt-1 text-xl">Packet tracker</h2>
            </div>
            <Link to="/app/applications" replace className="text-sm font-medium text-[var(--copper)]">
              Open
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <PipeStat n={sent.length} label="Sent" />
            <PipeStat n={inReview.length} label="In review" />
            <PipeStat n={hired.length} label="Hired" />
          </div>
          {latestTitle ? (
            <p className="mt-4 rounded-xl bg-[#eef3f0] px-3 py-2 text-sm">
              Latest: <span className="font-medium text-[var(--forest)]">{latestTitle}</span>
              {latestPacket ? (
                <span className="text-muted-foreground"> · {prettyStatus(latestPacket.status)}</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No packets yet. Score a role, then prepare one to approve.</p>
          )}
        </Card>

        {nextMatch ? (
          <Card className="shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">
                  Next packet
                </p>
                <h2 className="mt-1 font-serif text-2xl leading-tight text-[var(--forest)]">{nextMatch.job.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextMatch.job.company} · {nextMatch.score}% fit
                  {nextMatch.job.remote ? ' · Remote' : nextMatch.job.location ? ` · ${nextMatch.job.location}` : ''}
                </p>
              </div>
              <span className="rounded-full bg-[#e8efe8] px-2.5 py-1 text-xs font-medium text-[var(--forest)]">
                Best scored
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to={`/app/jobs/${nextMatch.job.id}`}>Why it fits</Link>
              </Button>
              <Button
                variant="copper"
                disabled={apply.isPending}
                onClick={() => apply.mutate(nextMatch.job.id)}
              >
                {apply.isPending ? 'Preparing…' : nextMatch.job.employerId ? 'Send to employer' : 'Prepare packet'}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
            <h2 className="text-xl">Score live roles</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Authorized boards only. We never scrape LinkedIn, Indeed, or Upwork.
            </p>
            <Button className="mt-4" variant="copper" disabled={search.isPending} onClick={() => search.mutate()}>
              <Search className="size-4" />
              {search.isPending ? 'Searching…' : 'Find matches'}
            </Button>
          </Card>
        )}

        <Card className="shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
          <form className="flex items-center gap-3" onSubmit={onComposer}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--forest)] font-serif text-sm text-[var(--paper)]">
              {initials(name)}
            </span>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Atelier to score a new search…"
              className="h-11 flex-1 rounded-full border border-input bg-[var(--paper)] px-4 text-sm outline-none focus:border-[var(--forest)]"
            />
            <Button type="submit" variant="copper" disabled={search.isPending}>
              {search.isPending ? 'Scoring…' : 'Go'}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip to="/app/resume" icon={ScrollText} label="Resume" />
            <Chip to="/app/profile" icon={Sparkles} label={profile.remoteWorldwide ? 'Open to remote' : 'Work prefs'} />
            <Chip to="/app/jobs" icon={Search} label="Matches" />
            <Chip to="/app/career" icon={LineChart} label="Coach" />
            <Chip to="/app/ateliar" icon={Timer} label="Tracker" />
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">Activity</h2>
          <div className="flex rounded-full border border-border bg-card p-0.5 text-xs">
            <button
              type="button"
              className={cn('rounded-full px-3 py-1.5', sort === 'fit' ? 'bg-[var(--forest)] text-[var(--paper)]' : 'text-muted-foreground')}
              onClick={() => setSort('fit')}
            >
              Best fit
            </button>
            <button
              type="button"
              className={cn('rounded-full px-3 py-1.5', sort === 'recent' ? 'bg-[var(--forest)] text-[var(--paper)]' : 'text-muted-foreground')}
              onClick={() => setSort('recent')}
            >
              Recent
            </button>
          </div>
        </div>

        {home.isLoading ? (
          <Card className="h-36 animate-pulse bg-muted/60 shadow-[0_10px_28px_rgba(19,38,31,0.06)]" />
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
            <div className="text-center">
              <Link to="/app/jobs" replace className="text-sm font-medium text-[var(--copper)]">
                See all scored roles
              </Link>
            </div>
          </div>
        ) : (
          <Card className="shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
            <p className="text-sm text-muted-foreground">
              No scored listings yet. Run a search and this feed fills with roles matched to your resume.
            </p>
          </Card>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card
          className={cn(
            'shadow-[0_10px_28px_rgba(19,38,31,0.06)]',
            atelierReady ? 'border-[#c6a15b66] bg-[#f7f1e4]' : 'bg-card',
          )}
        >
          <p className="text-sm font-medium text-[var(--forest)]">
            {atelierReady
              ? 'Studio is ready — packets leave only after you approve.'
              : 'Finish resume and title so matching stays honest.'}
          </p>
        </Card>

        <Card className="space-y-3 shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">
            Coach notes
          </p>
          <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>Sort the feed by best fit, not by who posted first.</li>
            <li>Open Career coach for gaps taken from your real matches.</li>
            <li>Atelier employers get the packet in-inbox. Other boards you submit yourself.</li>
          </ul>
          <Link to="/app/career" replace className="text-sm font-medium text-[var(--copper)]">
            Open career coach
          </Link>
        </Card>

        <Card className="space-y-3 shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">
            How we apply
          </p>
          <Play line="Approve first" detail="Nothing is sent until you review the letter and answers." />
          <Play line="No silent auto-apply" detail="We never submit on LinkedIn, Indeed, or Upwork." />
          <Play line="Keep skills honest" detail="The packet will not invent tools you did not list." />
        </Card>

        <Card className="space-y-3 shadow-[0_10px_28px_rgba(19,38,31,0.06)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--forest)]">My packets</p>
            <Link to="/app/applications" replace className="text-xs font-medium text-[var(--copper)]">
              All
            </Link>
          </div>
          {packets.length ? (
            <ul className="space-y-2">
              {packets.slice(0, 4).map((row) => (
                <li key={row.id}>
                  <Link
                    to={`/app/applications/${row.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm hover:text-[var(--copper)]"
                  >
                    <span className="truncate">
                      {matches.find((m) => m.job.id === row.jobId)?.job.title || 'Packet'}
                    </span>
                    <span className="shrink-0 capitalize text-xs text-muted-foreground">{prettyStatus(row.status)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None yet.</p>
          )}
        </Card>
      </aside>
    </div>
  )
}

function MiniStat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-serif text-lg tabular-nums text-[var(--forest)]">{n}</div>
      <div className="text-[0.65rem] leading-tight text-muted-foreground">{label}</div>
    </div>
  )
}

function PipeStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-[#eef3f0] py-3">
      <div className="font-serif text-2xl tabular-nums text-[var(--forest)]">{n}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function SideLink({ to, icon: Icon, label }: { to: string; icon: typeof Briefcase; label: string }) {
  return (
    <Link
      to={to}
      replace
      onMouseEnter={() => prefetchRoute(to)}
      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-[#eef3f0]"
    >
      <Icon className="size-4 text-[var(--forest)]" />
      {label}
    </Link>
  )
}

function Chip({ to, icon: Icon, label }: { to: string; icon: typeof Briefcase; label: string }) {
  return (
    <Link
      to={to}
      replace
      onMouseEnter={() => prefetchRoute(to)}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[var(--paper)] px-3 py-1.5 text-xs hover:border-[var(--forest)]"
    >
      <Icon className="size-3.5" />
      {label}
    </Link>
  )
}

function Play({ line, detail }: { line: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--forest)]">{line}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  )
}
