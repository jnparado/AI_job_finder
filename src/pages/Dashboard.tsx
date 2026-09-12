import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bookmark,
  Briefcase,
  Calendar,
  CheckCircle2,
  Home,
  LineChart,
  MapPin,
  MessageSquare,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  Timer,
} from 'lucide-react'
import type { JobMatch } from '@shared/types'
import { displayName, isStaffRole, sourceLabel } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { localBrandPath } from '@/lib/brandAssets'
import { prefetchRoute } from '@/lib/prefetch'
import { cn, initials, moneyBand, prettyStatus, profileCompleteness } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface AppRow {
  id: string
  status: string
  jobId: string
  createdAt?: string
  submittedAt?: string
}

interface CandidateHome {
  matches: JobMatch[]
  applications: AppRow[]
  threadCount: number
}

const INTERVIEW = new Set([
  'interview',
  'technical_interview',
  'hr_interview',
  'final_interview',
])

const SIDE_LINKS: { to: string; label: string; icon: typeof Home; end?: boolean; badge?: 'messages' }[] = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/applications', label: 'My Jobs / Applications', icon: Briefcase },
  { to: '/app/messages', label: 'Messages', icon: MessageSquare, badge: 'messages' },
  { to: '/app/resume', label: 'Resume', icon: ScrollText },
  { to: '/app/profile', label: 'Skills & Profile', icon: Sparkles },
  { to: '/app/ateliar', label: 'Calendar / Tracker', icon: Calendar },
  { to: '/app/career', label: 'Career Coach', icon: LineChart },
  { to: '/app/jobs', label: 'Matched Jobs', icon: Bookmark },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function DashboardPage() {
  const { profile, destinationFor } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
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
  const first = profile.firstName?.trim() || name.split(' ')[0] || 'there'
  const headline = profile.headline || profile.desiredTitle || profile.currentTitle || 'Candidate'
  const ready = profileCompleteness(profile)
  const greeting = timeGreeting()

  const applied = packets.filter((a) => a.status !== 'draft')
  const interviews = packets.filter((a) => INTERVIEW.has(a.status))
  const offers = packets.filter((a) => a.status === 'offer' || a.status === 'hired')
  const screening = packets.filter((a) => a.status === 'submitted' || a.status === 'under_review')
  const hired = packets.filter((a) => a.status === 'hired')
  const strongFits = matches.filter((m) => m.score >= 70)

  const recommended = useMemo(
    () => [...matches].sort((a, b) => b.score - a.score).slice(0, 3),
    [matches],
  )

  const activity = useMemo(() => buildActivity(packets, matches), [packets, matches])

  if (!candidateDesk) return <Navigate to={destinationFor(profile)} replace />

  function onComposer(e: FormEvent) {
    e.preventDefault()
    void search.mutate()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[15.5rem_minmax(0,1fr)_17rem] lg:items-start">
      {/* Left rail — forest profile + nav */}
      <aside className="space-y-4 lg:sticky lg:top-6">
        <div className="overflow-hidden rounded-2xl bg-[var(--forest)] text-[var(--paper)] shadow-[0_12px_32px_rgba(19,38,31,0.18)]">
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="size-12 rounded-full object-cover ring-2 ring-white/20" />
              ) : (
                <span className="grid size-12 place-items-center rounded-full bg-[#1f3d32] font-serif text-lg ring-2 ring-white/20">
                  {initials(name)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">{name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[#c9c0ae]">{headline}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 py-2.5 text-center">
              <MiniStat n={applied.length} label="Apps" />
              <MiniStat n={interviews.length} label="Interviews" />
              <MiniStat n={offers.length} label="Offers" />
            </div>

            <Button
              variant="outline"
              className="h-9 w-full rounded-xl border-white/20 bg-white/5 text-sm text-[var(--paper)] hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/app/profile">View My Profile</Link>
            </Button>
          </div>

          <nav className="space-y-0.5 border-t border-white/10 px-2 py-3">
            {SIDE_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                replace
                onMouseEnter={() => prefetchRoute(item.to)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive ? 'bg-white/15 font-medium text-white' : 'text-[#d8d0c0] hover:bg-white/8 hover:text-white',
                  )
                }
              >
                <item.icon className="size-4 shrink-0 opacity-80" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge === 'messages' && threadCount ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-[#e23d3d] px-1.5 text-[0.65rem] font-semibold leading-5 text-white">
                    {threadCount > 99 ? '99+' : threadCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="m-3 rounded-2xl bg-gradient-to-br from-[#2a3f36] to-[#1a2e27] p-4 ring-1 ring-[#c6a15b33]">
            <p className="text-sm font-medium text-[#e7d7a8]">Get More Opportunities</p>
            <p className="mt-1 text-xs leading-relaxed text-[#c9c0ae]">
              Finish your profile and run AI matching to surface stronger fits.
            </p>
            <Button className="mt-3 h-9 w-full rounded-xl bg-[#c6a15b] text-[var(--forest)] hover:bg-[#d4b46a]" asChild>
              <Link to="/app/resume">Upgrade Now</Link>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 space-y-5">
        <section className="overflow-hidden rounded-2xl border border-[#dce8e0] bg-gradient-to-r from-[#e7f3ea] via-[#eef6f0] to-white shadow-[0_10px_24px_rgba(19,38,31,0.05)]">
          <div className="grid items-center lg:grid-cols-[minmax(0,1.15fr)_minmax(12rem,0.7fr)]">
            <div className="p-4 sm:p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#147a48]">
                {greeting}, {first}
              </p>
              <h1 className="mt-1.5 font-serif text-2xl leading-tight text-[var(--forest)] sm:text-[1.85rem]">
                Your next role is closer than you think.
              </h1>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-[#4d5a54]">
                AI scores live roles against your resume. Packets leave only after you approve — we never silent
                auto-apply.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="h-10 rounded-full bg-[var(--copper)] !text-white hover:bg-[var(--copper-dark)]"
                  disabled={search.isPending}
                  onClick={() => search.mutate()}
                >
                  <Search className="size-4" />
                  {search.isPending ? 'Matching…' : 'Find Jobs'}
                </Button>
                <Button variant="outline" className="h-10 rounded-full border-[var(--forest)] bg-white" asChild>
                  <Link to="/app/resume">
                    <ScrollText className="size-4" />
                    Improve My Resume
                  </Link>
                </Button>
              </div>
              <form className="mt-3 flex gap-2" onSubmit={onComposer}>
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Optional: tell AI what to search for…"
                  className="h-10 min-w-0 flex-1 rounded-full border border-[#d7eadc] bg-white/80 px-4 text-sm outline-none focus:border-[#147a48]"
                />
              </form>
            </div>
            <div className="relative hidden h-36 p-3 sm:block lg:h-[11rem]">
              <img
                src={localBrandPath('candidate-hero.jpg')}
                alt=""
                className="h-full w-full rounded-2xl object-cover object-center"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Briefcase} label="Jobs Applied" value={applied.length} tone="blue" hint={monthHint(applied)} />
          <StatCard icon={Calendar} label="Interviews" value={interviews.length} tone="violet" hint={monthHint(interviews)} />
          <StatCard icon={CheckCircle2} label="Offers" value={offers.length} tone="green" hint={monthHint(offers)} />
          <StatCard
            icon={Bookmark}
            label="Strong AI Fits"
            value={strongFits.length}
            tone="amber"
            hint={matches.length ? `${matches.length} scored` : undefined}
          />
        </div>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl text-[var(--forest)]">Recommended for You</h2>
              <p className="text-sm text-muted-foreground">Ranked by Atelier AI match against your profile.</p>
            </div>
            <Link to="/app/jobs" replace className="text-sm font-medium text-[#147a48] hover:underline">
              See all matches
            </Link>
          </div>

          {home.isLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-[#eef3f0]" />
              ))}
            </div>
          ) : recommended.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {recommended.map((m) => (
                <RecommendedCard
                  key={m.job.id}
                  match={m}
                  applying={apply.isPending && apply.variables === m.job.id}
                  onApply={() => apply.mutate(m.job.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e4ebe6] bg-white p-8 text-center shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
              <Sparkles className="mx-auto size-8 text-[#147a48]" />
              <p className="mt-3 font-serif text-xl text-[var(--forest)]">No AI matches yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Run Find Jobs so Atelier can score authorized listings against your resume.
              </p>
              <Button
                className="mt-4 rounded-full bg-[var(--forest)] !text-white"
                disabled={search.isPending}
                onClick={() => search.mutate()}
              >
                {search.isPending ? 'Matching…' : 'Run AI match'}
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl text-[var(--forest)]">Application Progress</h2>
            <Link to="/app/applications" className="text-sm font-medium text-[#147a48] hover:underline">
              Open pipeline
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <PipeStep label="Applied" n={applied.length} active={applied.length > 0} />
            <PipeStep label="Screening" n={screening.length} active={screening.length > 0} />
            <PipeStep label="Interview" n={interviews.length} active={interviews.length > 0} />
            <PipeStep label="Offer" n={offers.length} active={offers.length > 0} />
            <PipeStep label="Hired" n={hired.length} active={hired.length > 0} />
          </div>
        </section>
      </div>

      {/* Right rail */}
      <aside className="space-y-4 lg:sticky lg:top-6">
        <div className="rounded-2xl border border-[#e4ebe6] bg-white p-5 text-center shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Resume Strength
          </p>
          <div className="relative mx-auto mt-4 grid size-28 place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 size-28 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef3f0" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#147a48"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(ready / 100) * 97.4} 97.4`}
              />
            </svg>
            <span className="font-serif text-3xl tabular-nums text-[var(--forest)]">{ready}%</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Based on profile completeness for honest matching.</p>
          <Button className="mt-4 h-9 w-full rounded-full bg-[var(--forest)] !text-white" asChild>
            <Link to="/app/resume">Improve Resume</Link>
          </Button>
        </div>

        <div className="rounded-2xl bg-[var(--forest)] p-5 text-[var(--paper)] shadow-[0_10px_24px_rgba(19,38,31,0.14)]">
          <div className="flex items-center gap-2 text-[#c6a15b]">
            <Sparkles className="size-4" />
            <p className="text-sm font-medium">AI Career Coach</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#d8d0c0]">
            Gap notes and next moves from your real match scores — not generic advice.
          </p>
          <Button className="mt-4 h-9 w-full rounded-full bg-[#c6a15b] text-[var(--forest)] hover:bg-[#d4b46a]" asChild>
            <Link to="/app/career">Open Career Coach</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent Activity
          </p>
          {activity.length ? (
            <ul className="mt-3 space-y-3">
              {activity.map((row) => (
                <li key={row.id} className="flex gap-2.5 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#147a48]" />
                  <div className="min-w-0">
                    {row.href ? (
                      <Link to={row.href} className="font-medium text-[var(--forest)] hover:text-[#147a48]">
                        {row.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-[var(--forest)]">{row.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{row.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Activity shows up as you apply and match.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#e4ebe6] bg-[#f7f1e4] p-4 text-center">
          <Timer className="mx-auto size-4 text-[var(--copper)]" />
          <p className="mt-2 font-serif text-sm italic leading-relaxed text-[var(--forest)]">
            “Small steps every day lead to big opportunities.”
          </p>
        </div>
      </aside>
    </div>
  )
}

function RecommendedCard({
  match,
  onApply,
  applying,
}: {
  match: JobMatch
  onApply: () => void
  applying?: boolean
}) {
  const job = match.job
  const atelier = job.source === 'atelier' || Boolean(job.employerId)
  const skills = [...new Set([...(match.matchedSkills ?? []), ...job.skills])].slice(0, 4)
  const place = job.remote ? 'Remote' : job.location || 'Location flexible'

  return (
    <article className="flex flex-col rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div className="grid size-10 place-items-center rounded-xl bg-[#e8f3ec] font-serif text-sm text-[var(--forest)]">
          {(job.company || 'A').slice(0, 1).toUpperCase()}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f3ea] px-2.5 py-1 text-xs font-semibold text-[#147a48]">
          <Sparkles className="size-3" />
          Matched {match.score}%
        </span>
      </div>
      <Link to={`/app/jobs/${job.id}`} className="mt-3 block">
        <h3 className="font-serif text-lg leading-snug text-[var(--forest)] hover:text-[#147a48]">{job.title}</h3>
      </Link>
      <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" />
          {place}
        </span>
        <span>{moneyBand(job.salaryMin, job.salaryMax, job.currency)}</span>
      </p>
      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span key={skill} className="rounded-full bg-[#eef3f0] px-2 py-0.5 text-[0.7rem] text-[var(--forest)]">
              {skill}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {match.summary || match.recommendation || (atelier ? 'Apply on Atelier — packet needs your approval.' : `Listed on ${sourceLabel(job.source)}.`)}
      </p>
      <Button
        className="mt-auto w-full rounded-full bg-[var(--forest)] !text-white hover:bg-[var(--forest-2)]"
        disabled={applying}
        onClick={onApply}
      >
        {applying ? 'Preparing…' : atelier ? 'Apply Now' : 'Prepare packet'}
      </Button>
    </article>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof Briefcase
  label: string
  value: number
  tone: 'blue' | 'violet' | 'green' | 'amber'
  hint?: string
}) {
  const tones = {
    blue: 'bg-[#eaf2ff] text-[#3b6fd8]',
    violet: 'bg-[#f1e8ff] text-[#7b5cb0]',
    green: 'bg-[#e8f3ec] text-[#147a48]',
    amber: 'bg-[#fff4e5] text-[#c47b12]',
  }
  return (
    <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)]">
      <span className={cn('grid size-9 place-items-center rounded-xl', tones[tone])}>
        <Icon className="size-4" />
      </span>
      <p className="mt-3 font-serif text-3xl tabular-nums text-[var(--forest)]">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="mt-1 text-xs text-[#147a48]">{hint}</p> : null}
    </div>
  )
}

function PipeStep({ label, n, active }: { label: string; n: number; active: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl px-2 py-3 text-center',
        active ? 'bg-[#e8f3ec] text-[var(--forest)]' : 'bg-[#f4f7f5] text-muted-foreground',
      )}
    >
      <p className="font-serif text-2xl tabular-nums">{n}</p>
      <p className="text-[0.7rem] font-medium">{label}</p>
    </div>
  )
}

function MiniStat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-serif text-base tabular-nums text-white">{n}</div>
      <div className="text-[0.6rem] leading-tight text-[#a8b5ad]">{label}</div>
    </div>
  )
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function monthHint(rows: AppRow[]) {
  const cutoff = Date.now() - 30 * 86_400_000
  const n = rows.filter((r) => {
    const t = r.submittedAt || r.createdAt
    return t && new Date(t).getTime() >= cutoff
  }).length
  return n ? `+${n} this month` : undefined
}

function buildActivity(packets: AppRow[], matches: JobMatch[]) {
  const titleFor = (jobId: string) => matches.find((m) => m.job.id === jobId)?.job.title || 'a role'
  const rows = packets.slice(0, 5).map((p) => ({
    id: p.id,
    title: `Application · ${prettyStatus(p.status)}`,
    detail: titleFor(p.jobId),
    href: `/app/applications/${p.id}`,
  }))
  if (!rows.length && matches[0]) {
    rows.push({
      id: `match-${matches[0].job.id}`,
      title: `AI matched ${matches[0].score}%`,
      detail: matches[0].job.title,
      href: `/app/jobs/${matches[0].job.id}`,
    })
  }
  return rows
}
