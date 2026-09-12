import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Bookmark,
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  LineChart,
  Mail,
  MapPin,
  Pencil,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { JobMatch } from '@shared/types'
import { displayName, isStaffRole } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { localBrandPath } from '@/lib/brandAssets'
import { cn, initials, money, moneyBand, postedLabel, prettyStatus, profileCompleteness } from '@/lib/utils'
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

const SAVED_KEY = 'atelier-candidate-saved'

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeSaved(ids: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

export function DashboardPage() {
  const { profile, destinationFor } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const candidateDesk = profile.role !== 'employer' && !isStaffRole(profile.role)
  const [saved, setSaved] = useState(readSaved)

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
  const name = displayName(profile)
  const headline = profile.headline || profile.desiredTitle || profile.currentTitle || 'Candidate'
  const place = [profile.city, profile.country].filter(Boolean).join(', ')
  const ready = profileCompleteness(profile)
  const portfolio = profile.socialLinks?.portfolio || profile.socialLinks?.website || profile.socialLinks?.linkedin || ''

  const applied = packets.filter((a) => a.status !== 'draft')
  const interviews = packets.filter((a) => INTERVIEW.has(a.status))
  const offers = packets.filter((a) => a.status === 'offer' || a.status === 'hired')
  const screening = packets.filter((a) => a.status === 'submitted' || a.status === 'under_review')
  const hired = packets.filter((a) => a.status === 'hired')

  const recommended = useMemo(
    () => [...matches].sort((a, b) => b.score - a.score).slice(0, 3),
    [matches],
  )

  const insights = useMemo(() => buildInsights(matches, profile.skills), [matches, profile.skills])
  const activity = useMemo(() => buildActivity(packets, matches), [packets, matches])
  const upcoming = useMemo(
    () =>
      packets
        .filter((p) => INTERVIEW.has(p.status) || p.status === 'offer')
        .slice(0, 3)
        .map((p) => ({
          id: p.id,
          title: INTERVIEW.has(p.status) ? 'Interview' : 'Offer follow-up',
          detail: matches.find((m) => m.job.id === p.jobId)?.job.company || matches.find((m) => m.job.id === p.jobId)?.job.title || 'Role',
          href: `/app/applications/${p.id}`,
          action: INTERVIEW.has(p.status) ? 'Join' : 'View',
        })),
    [packets, matches],
  )

  if (!candidateDesk) return <Navigate to={destinationFor(profile)} replace />

  function toggleSave(jobId: string) {
    setSaved((cur) => {
      const next = cur.includes(jobId) ? cur.filter((id) => id !== jobId) : [...cur, jobId]
      writeSaved(next)
      return next
    })
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-5 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start">
      <div className="min-w-0 space-y-5">
        {/* Profile + hero */}
        <section className="overflow-hidden rounded-2xl border border-[#e4ebe6] bg-white shadow-[0_10px_28px_rgba(19,38,31,0.04)]">
          <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(14rem,0.95fr)]">
            <div className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
              <div className="relative shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="size-20 rounded-full object-cover sm:size-24" />
                ) : (
                  <span className="grid size-20 place-items-center rounded-full bg-[#e8f3ec] font-serif text-2xl text-[var(--forest)] sm:size-24">
                    {initials(name)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="flex flex-wrap items-center gap-1.5 font-serif text-2xl text-[var(--forest)] sm:text-[1.75rem]">
                  <span className="truncate">{name}</span>
                  {profile.onboardingCompleted ? <BadgeCheck className="size-5 text-[#147a48]" /> : null}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{headline}</span>
                  <Link to="/app/profile" className="inline-flex text-[#147a48] hover:underline" aria-label="Edit profile">
                    <Pencil className="size-3.5" />
                  </Link>
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  {place ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-[#147a48]" />
                      {place}
                    </span>
                  ) : null}
                  {profile.yearsExperience ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="size-3.5 text-[#147a48]" />
                      {profile.yearsExperience}+ years
                    </span>
                  ) : null}
                  {profile.email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="size-3.5 text-[#147a48]" />
                      <span className="truncate">{profile.email}</span>
                    </span>
                  ) : null}
                  {portfolio ? (
                    <a
                      href={portfolio.startsWith('http') ? portfolio : `https://${portfolio}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#2f6fed] hover:underline"
                    >
                      <Globe className="size-3.5" />
                      Portfolio
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative min-h-[11rem] overflow-hidden">
              <img
                src={localBrandPath('candidate-hero.jpg')}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--forest)]/80 via-[var(--forest)]/45 to-transparent" />
              <div className="relative flex h-full flex-col justify-center gap-3 p-5 text-white sm:p-6">
                <h2 className="max-w-[14rem] font-serif text-2xl leading-tight sm:text-[1.65rem]">
                  Better Skills, Brighter Opportunities.
                </h2>
                <p className="max-w-[16rem] text-sm text-white/85">
                  AI scores roles against your resume — packets leave only after you approve.
                </p>
                <Button
                  className="h-10 w-fit rounded-full bg-[var(--forest)] !text-white ring-1 ring-white/30 hover:bg-[var(--forest-2)]"
                  disabled={search.isPending}
                  onClick={() => search.mutate()}
                >
                  <Search className="size-4" />
                  {search.isPending ? 'Matching…' : 'Find Jobs →'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Briefcase} label="Jobs Applied" value={applied.length} tone="green" hint={monthHint(applied)} />
          <StatCard icon={Users} label="Interviews" value={interviews.length} tone="orange" hint={monthHint(interviews)} />
          <StatCard icon={FileText} label="Offers" value={offers.length} tone="violet" hint={monthHint(offers)} />
          <StatCard icon={Bookmark} label="Saved Jobs" value={saved.length} tone="blue" hint={saved.length ? 'On this device' : undefined} />
        </div>

        {/* Recommended */}
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl text-[var(--forest)]">Recommended Jobs for You</h2>
              <p className="text-sm text-muted-foreground">Ranked by Atelier AI match against your profile.</p>
            </div>
            <Link to="/app/jobs" className="text-sm font-medium text-[#147a48] hover:underline">
              View All →
            </Link>
          </div>

          {home.isLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : recommended.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {recommended.map((m, i) => (
                <RecommendedCard
                  key={m.job.id}
                  match={m}
                  featured={i === 0 && m.score >= 85}
                  saved={saved.includes(m.job.id)}
                  applying={apply.isPending && apply.variables === m.job.id}
                  onSave={() => toggleSave(m.job.id)}
                  onApply={() => apply.mutate(m.job.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e4ebe6] bg-white p-8 text-center">
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

        {/* Application progress */}
        <section className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl text-[var(--forest)]">Application Progress</h2>
            <Link to="/app/applications" className="text-sm font-medium text-[#147a48] hover:underline">
              Open pipeline
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
            <PipeNode n={applied.length} label="Applied" tone="green" />
            <PipeArrow />
            <PipeNode n={screening.length} label="In Review" tone="blue" />
            <PipeArrow />
            <PipeNode n={interviews.length} label="Interview" tone="orange" />
            <PipeArrow />
            <PipeNode n={offers.length} label="Offer" tone="violet" />
            <PipeArrow />
            <PipeNode n={hired.length} label="Hired" tone="gray" />
          </div>
        </section>

        {/* Career insights */}
        <section>
          <h2 className="mb-3 font-serif text-xl text-[var(--forest)]">Career Insights</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <InsightCard
              icon={Sparkles}
              title="In-Demand Skills"
              body={insights.skills.length ? insights.skills.join(' · ') : 'Add skills on your profile to see demand signals.'}
              href="/app/profile"
              link="View skills →"
            />
            <InsightCard
              icon={LineChart}
              title="Salary Insights"
              body={insights.salary || 'Score more roles to estimate pay bands for your matches.'}
              href="/app/career"
              link="View salary →"
            />
            <InsightCard
              icon={TrendingUp}
              title="Market Trends"
              body={insights.trend}
              href="/app/jobs"
              link="View trends →"
            />
          </div>
        </section>
      </div>

      {/* Right rail */}
      <aside className="space-y-4 xl:sticky xl:top-24">
        <div className="rounded-2xl border border-[#e4ebe6] bg-white p-5 shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Profile Completeness
          </p>
          <p className="mt-2 font-serif text-3xl tabular-nums text-[var(--forest)]">{ready}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef3f0]">
            <div className="h-full rounded-full bg-[#147a48]" style={{ width: `${ready}%` }} />
          </div>
          <Button variant="outline" className="mt-4 h-9 w-full rounded-full" asChild>
            <Link to="/app/profile">Improve Profile</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Upcoming Activities
          </p>
          {upcoming.length ? (
            <ul className="mt-3 space-y-3">
              {upcoming.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--forest)]">
                      <Calendar className="size-3.5 text-[#147a48]" />
                      {row.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{row.detail}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-lg" asChild>
                    <Link to={row.href}>{row.action}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No interviews or offers scheduled yet.</p>
          )}
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
                    <Link to={row.href} className="font-medium text-[var(--forest)] hover:text-[#147a48]">
                      {row.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{row.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Activity shows up as you apply and match.</p>
          )}
        </div>
      </aside>
    </div>
  )
}

function RecommendedCard({
  match,
  featured,
  saved,
  onSave,
  onApply,
  applying,
}: {
  match: JobMatch
  featured?: boolean
  saved: boolean
  onSave: () => void
  onApply: () => void
  applying?: boolean
}) {
  const job = match.job
  const atelier = job.source === 'atelier' || Boolean(job.employerId)
  const skills = [...new Set([...(match.matchedSkills ?? []), ...job.skills])].slice(0, 4)
  const place = job.remote ? 'Remote' : job.location || 'Flexible'

  return (
    <article className="flex flex-col rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f3ec] font-serif text-sm text-[var(--forest)]">
          {(job.company || 'A').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm text-muted-foreground">{job.company}</p>
            {featured ? (
              <span className="rounded-full bg-[#fff4e5] px-2 py-0.5 text-[0.65rem] font-semibold text-[#c47b12]">
                Featured
              </span>
            ) : null}
          </div>
          <Link to={`/app/jobs/${job.id}`} className="mt-0.5 block">
            <h3 className="font-serif text-lg leading-snug text-[var(--forest)] hover:text-[#147a48]">{job.title}</h3>
          </Link>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" />
          {place}
        </span>
        <span>{moneyBand(job.salaryMin, job.salaryMax, job.currency)}</span>
        <span>{postedLabel(job.postedAt)}</span>
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

      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#147a48]">
        <CheckCircle2 className="size-4" />
        Matched {match.score}%
      </p>

      <div className="mt-auto flex gap-2 pt-3">
        <Button
          type="button"
          variant="outline"
          className={cn('h-9 flex-1 rounded-full', saved && 'border-[#147a48] text-[#147a48]')}
          onClick={onSave}
        >
          <Bookmark className={cn('size-3.5', saved && 'fill-current')} />
          {saved ? 'Saved' : 'Save'}
        </Button>
        <Button
          className="h-9 flex-1 rounded-full bg-[var(--forest)] !text-white hover:bg-[var(--forest-2)]"
          disabled={applying}
          onClick={onApply}
        >
          {applying ? 'Preparing…' : atelier ? 'Apply Now' : 'Prepare'}
        </Button>
      </div>
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
  tone: 'green' | 'orange' | 'violet' | 'blue'
  hint?: string
}) {
  const tones = {
    green: 'bg-[#e8f3ec] text-[#147a48]',
    orange: 'bg-[#fff4e5] text-[#c47b12]',
    violet: 'bg-[#f1e8ff] text-[#7b5cb0]',
    blue: 'bg-[#eaf2ff] text-[#3b6fd8]',
  }
  const hints = {
    green: 'text-[#147a48]',
    orange: 'text-[#c47b12]',
    violet: 'text-[#147a48]',
    blue: 'text-[#147a48]',
  }
  return (
    <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)]">
      <span className={cn('grid size-9 place-items-center rounded-xl', tones[tone])}>
        <Icon className="size-4" />
      </span>
      <p className="mt-3 font-serif text-3xl tabular-nums text-[var(--forest)]">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint ? <p className={cn('mt-1 text-xs', hints[tone])}>{hint}</p> : null}
    </div>
  )
}

function PipeNode({ n, label, tone }: { n: number; label: string; tone: 'green' | 'blue' | 'orange' | 'violet' | 'gray' }) {
  const tones = {
    green: 'bg-[#147a48] text-white',
    blue: 'bg-[#3b6fd8] text-white',
    orange: 'bg-[#c47b12] text-white',
    violet: 'bg-[#7b5cb0] text-white',
    gray: 'bg-[#9aa89f] text-white',
  }
  return (
    <div className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-1.5 text-center">
      <span className={cn('grid size-10 place-items-center rounded-full font-serif text-lg tabular-nums', tones[tone])}>
        {n}
      </span>
      <span className="text-[0.7rem] font-medium text-[var(--forest)]">{label}</span>
    </div>
  )
}

function PipeArrow() {
  return <span className="hidden text-muted-foreground sm:inline">→</span>
}

function InsightCard({
  icon: Icon,
  title,
  body,
  href,
  link,
}: {
  icon: typeof Sparkles
  title: string
  body: string
  href: string
  link: string
}) {
  return (
    <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)]">
      <span className="grid size-9 place-items-center rounded-xl bg-[#e8f3ec] text-[#147a48]">
        <Icon className="size-4" />
      </span>
      <h3 className="mt-3 font-medium text-[var(--forest)]">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Link to={href} className="mt-3 inline-block text-sm font-medium text-[#147a48] hover:underline">
        {link}
      </Link>
    </div>
  )
}

function monthHint(rows: AppRow[]) {
  const cutoff = Date.now() - 30 * 86_400_000
  const n = rows.filter((r) => {
    const t = r.submittedAt || r.createdAt
    return t && new Date(t).getTime() >= cutoff
  }).length
  return n ? `+${n} this month` : undefined
}

function buildInsights(matches: JobMatch[], profileSkills: string[]) {
  const skillCount = new Map<string, number>()
  for (const m of matches) {
    for (const s of m.matchedSkills ?? []) {
      skillCount.set(s, (skillCount.get(s) || 0) + 1)
    }
  }
  const fromMatches = [...skillCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s)
    .slice(0, 5)
  const skills = fromMatches.length ? fromMatches : profileSkills.slice(0, 5)

  const pay = matches
    .map((m) => ({ min: m.job.salaryMin ?? 0, max: m.job.salaryMax ?? 0, currency: m.job.currency }))
    .filter((p) => p.min || p.max)
  let salary = ''
  if (pay.length) {
    const mins = pay.map((p) => p.min).filter((n) => n > 0)
    const maxs = pay.map((p) => p.max).filter((n) => n > 0)
    const currency = pay[0]?.currency || 'USD'
    if (mins.length && maxs.length) {
      salary = `${money(Math.min(...mins), currency)} – ${money(Math.max(...maxs), currency)} across your matches`
    }
  }

  const strong = matches.filter((m) => m.score >= 70).length
  const trend = matches.length
    ? `${strong} of ${matches.length} scored roles are 70%+ AI fits right now.`
    : 'Run AI matching to see how your market is moving.'

  return { skills, salary, trend }
}

function buildActivity(packets: AppRow[], matches: JobMatch[]) {
  const titleFor = (jobId: string) => matches.find((m) => m.job.id === jobId)?.job.title || 'a role'
  const rows = packets.slice(0, 5).map((p) => ({
    id: p.id,
    title: `You ${prettyStatus(p.status).toLowerCase()}`,
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
