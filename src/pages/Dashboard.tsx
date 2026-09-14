import { useMemo, useState, type ReactNode } from 'react'
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
  MessageCircle,
  Pencil,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import type { CareerInsights, JobMatch } from '@shared/types'
import { displayName, isStaffRole } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { localBrandPath } from '@/lib/brandAssets'
import { AiJobAssistant } from '@/components/candidate/AiJobAssistant'
import { cn, initials, money, moneyBand, postedLabel, prettyStatus, profileCompleteness } from '@/lib/utils'
import { pendingInviteCount } from '@/lib/candidateInvites'
import type { CandidateInvite } from '@/lib/candidateInvites'
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
  const [assistantOpen, setAssistantOpen] = useState(false)

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

  const coach = useQuery({
    queryKey: ['career'],
    queryFn: () => api<CareerInsights>('/api/career'),
    staleTime: 60_000,
    enabled: candidateDesk,
  })

  const invites = useQuery({
    queryKey: ['candidate-invites'],
    queryFn: () => api<CandidateInvite[]>('/api/candidate/invites'),
    staleTime: 60_000,
    enabled: candidateDesk,
  })
  const pendingInvites = pendingInviteCount(invites.data ?? [])

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

  const recommended = useMemo(
    () => [...matches].sort((a, b) => b.score - a.score).slice(0, 3),
    [matches],
  )
  const topMatch = recommended[0] ?? null

  const insights = useMemo(() => buildInsights(matches, profile.skills, coach.data), [matches, profile.skills, coach.data])
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
    <div className="relative mx-auto grid max-w-[1400px] gap-4 pb-24 sm:gap-5 sm:pb-28 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start xl:pb-0">
      <div className="min-w-0 space-y-4 sm:space-y-5">
        {pendingInvites ? (
          <Link
            to="/app/invites"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfe8d9] bg-[#f3faf6] px-4 py-3 sm:px-5"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#2f9a6f]">
                <Mail className="size-5" />
              </span>
              <div>
                <p className="font-medium text-[#002018]">
                  {pendingInvites} employer invite{pendingInvites === 1 ? '' : 's'} waiting
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Review the role and send a packet only if you want to apply.
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-[#2f9a6f]">View invites →</span>
          </Link>
        ) : null}

        {/* Profile + hero */}
        <section className="overflow-hidden rounded-2xl border border-[#e7ebe9] bg-white shadow-[0_10px_28px_rgba(0,32,24,0.05)]">
          <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(14rem,0.95fr)]">
            <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
              <div className="relative shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="size-16 rounded-full object-cover sm:size-24" />
                ) : (
                  <span className="grid size-16 place-items-center rounded-full bg-[#e7f6ef] font-serif text-xl text-[#002018] sm:size-24 sm:text-2xl">
                    {initials(name)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="flex flex-wrap items-center gap-1.5 font-serif text-[1.35rem] leading-tight text-[#111827] sm:text-2xl lg:text-[1.75rem]">
                  <span className="break-words">{name}</span>
                  {profile.onboardingCompleted ? <BadgeCheck className="size-5 shrink-0 text-[#2f9a6f]" /> : null}
                </h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-base leading-relaxed text-[#6b7280] sm:text-sm">
                  <span className="break-words">{headline}</span>
                  <Link to="/app/profile" className="inline-flex text-[#2f9a6f] hover:underline" aria-label="Edit profile">
                    <Pencil className="size-4" />
                  </Link>
                </p>
                <div className="mt-3 flex flex-col gap-2 text-base text-[#6b7280] sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1.5 sm:text-sm">
                  {place ? (
                    <span className="inline-flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-[#2f9a6f]" />
                      <span className="break-words">{place}</span>
                    </span>
                  ) : null}
                  {profile.yearsExperience ? (
                    <span className="inline-flex items-center gap-2">
                      <Briefcase className="size-4 shrink-0 text-[#2f9a6f]" />
                      {profile.yearsExperience}+ years
                    </span>
                  ) : null}
                  {profile.email ? (
                    <span className="inline-flex items-start gap-2">
                      <Mail className="mt-0.5 size-4 shrink-0 text-[#2f9a6f]" />
                      <span className="break-all">{profile.email}</span>
                    </span>
                  ) : null}
                  {portfolio ? (
                    <a
                      href={portfolio.startsWith('http') ? portfolio : `https://${portfolio}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-[#2f6fed] hover:underline"
                    >
                      <Globe className="size-4 shrink-0" />
                      Portfolio
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative min-h-[10rem] overflow-hidden sm:min-h-[11rem] lg:min-h-0">
              <img
                src={localBrandPath('candidate-hero.jpg', 'candidate')}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002018]/90 via-[#002018]/55 to-[#002018]/25 lg:bg-gradient-to-r lg:from-[#002018]/85 lg:via-[#002018]/45 lg:to-transparent" />
              <div className="relative flex h-full min-h-[10rem] flex-col justify-end gap-3 p-4 text-white sm:min-h-[11rem] sm:p-6 lg:justify-center">
                <h2 className="max-w-sm font-serif text-[1.35rem] leading-tight sm:text-2xl lg:max-w-[14rem] lg:text-[1.65rem]">
                  Better Skills, Brighter Opportunities.
                </h2>
                <p className="max-w-md text-base leading-relaxed text-white/90 sm:max-w-sm sm:text-sm lg:max-w-[16rem]">
                  AI scores roles against your resume — packets leave only after you approve.
                </p>
                <Button
                  className="h-11 w-full rounded-full bg-[#002820] !text-white hover:bg-[#001510] sm:h-10 sm:w-fit"
                  onClick={() => setAssistantOpen(true)}
                >
                  Find Jobs →
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Profile completeness — mobile only (sidebar on desktop) */}
        <div className="rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)] xl:hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Profile Completeness
          </p>
          <p className="mt-2 font-serif text-3xl tabular-nums text-[#002018]">{ready}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#eef2f0]">
            <div className="h-full rounded-full bg-[#2f9a6f]" style={{ width: `${ready}%` }} />
          </div>
          <Button variant="outline" className="mt-4 h-11 w-full rounded-full sm:h-9" asChild>
            <Link to="/app/profile">Improve Profile</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Briefcase} label="Jobs Applied" value={applied.length} tone="green" hint={monthHint(applied)} />
          <StatCard icon={Users} label="Interviews" value={interviews.length} tone="orange" hint={monthHint(interviews)} />
          <StatCard icon={FileText} label="Offers" value={offers.length} tone="violet" hint={monthHint(offers)} />
          <StatCard icon={Bookmark} label="Saved Jobs" value={saved.length} tone="blue" hint={saved.length ? 'On this device' : undefined} />
        </div>

        {/* Recommended */}
        <section>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 sm:items-end">
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-[1.25rem] leading-tight text-[#002018] sm:text-xl">Recommended Jobs for You</h2>
              <p className="mt-1 text-base leading-relaxed text-muted-foreground sm:text-sm">Ranked by Atelier AI match against your profile.</p>
            </div>
            <Link to="/app/jobs" className="shrink-0 text-base font-medium text-[#2f9a6f] hover:underline sm:text-sm">
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
            <div className="rounded-2xl border border-[#e7ebe9] bg-white p-8 text-center">
              <Sparkles className="mx-auto size-8 text-[#2f9a6f]" />
              <p className="mt-3 font-serif text-xl text-[#002018]">No AI matches yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Use the AI Job Assistant above — Find matches scores authorized listings against your resume.
              </p>
            </div>
          )}
        </section>

        {/* Career insights */}
        <section>
          <h2 className="mb-3 font-serif text-[1.25rem] text-[#002018] sm:text-xl">Career Insights</h2>
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

        {/* Mobile rail */}
        <div className="space-y-4 xl:hidden">
          <DashboardRailCard title="Upcoming Activities" empty="No interviews or offers scheduled yet.">
            {upcoming.length ? (
              <ul className="mt-3 space-y-4">
                {upcoming.map((row) => (
                  <li key={row.id} className="flex flex-col gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-base font-medium text-[#002018]">
                        <Calendar className="size-4 shrink-0 text-[#2f9a6f]" />
                        {row.title}
                      </p>
                      <p className="mt-0.5 break-words text-base text-muted-foreground">{row.detail}</p>
                    </div>
                    <Button variant="outline" className="h-11 w-full rounded-lg" asChild>
                      <Link to={row.href}>{row.action}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </DashboardRailCard>

          <DashboardRailCard title="Recent Activity" empty="Activity shows up as you apply and match.">
            {activity.length ? (
              <ul className="mt-3 space-y-3">
                {activity.map((row) => (
                  <li key={row.id} className="flex gap-2.5 text-base">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#2f9a6f]" />
                    <div className="min-w-0">
                      <Link to={row.href} className="font-medium leading-snug text-[#002018] hover:text-[#2f9a6f]">
                        {row.title}
                      </Link>
                      <p className="mt-0.5 break-words text-base text-muted-foreground">{row.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </DashboardRailCard>
        </div>
      </div>

      {/* Right rail — desktop only */}
      <aside className="hidden space-y-4 xl:sticky xl:top-24 xl:block">
        <div className="rounded-2xl border border-[#e7ebe9] bg-white p-5 shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Profile Completeness
          </p>
          <p className="mt-2 font-serif text-3xl tabular-nums text-[#002018]">{ready}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef2f0]">
            <div className="h-full rounded-full bg-[#2f9a6f]" style={{ width: `${ready}%` }} />
          </div>
          <Button variant="outline" className="mt-4 h-9 w-full rounded-full" asChild>
            <Link to="/app/profile">Improve Profile</Link>
          </Button>
        </div>

        <DashboardRailCard title="Upcoming Activities" empty="No interviews or offers scheduled yet.">
          {upcoming.length ? (
            <ul className="mt-3 space-y-3">
              {upcoming.map((row) => (
                <li key={row.id} className="flex flex-col gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-base font-medium text-[#002018] sm:text-sm">
                      <Calendar className="size-4 shrink-0 text-[#2f9a6f] sm:size-3.5" />
                      {row.title}
                    </p>
                    <p className="mt-0.5 break-words text-base text-muted-foreground sm:text-xs">{row.detail}</p>
                  </div>
                  <Button variant="outline" className="h-11 w-full rounded-lg sm:h-8 sm:w-auto" asChild>
                    <Link to={row.href}>{row.action}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </DashboardRailCard>

        <DashboardRailCard title="Recent Activity" empty="Activity shows up as you apply and match.">
          {activity.length ? (
            <ul className="mt-3 space-y-3">
              {activity.map((row) => (
                <li key={row.id} className="flex gap-2.5 text-base sm:text-sm">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#2f9a6f] sm:mt-1.5" />
                  <div className="min-w-0">
                    <Link to={row.href} className="font-medium leading-snug text-[#002018] hover:text-[#2f9a6f]">
                      {row.title}
                    </Link>
                    <p className="mt-0.5 break-words text-base text-muted-foreground sm:text-xs">{row.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </DashboardRailCard>
      </aside>

      {/* AI Job Assistant FAB — matches screenshot */}
      <button
        type="button"
        aria-label="Open AI Job Assistant"
        onClick={() => setAssistantOpen(true)}
        className="fixed z-40 grid size-14 place-items-center rounded-full bg-[#002018] text-white shadow-[0_12px_28px_rgba(0,32,24,0.35)] hover:bg-[#001510] max-sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] max-sm:right-[max(1rem,env(safe-area-inset-right))] sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="size-6" strokeWidth={1.75} />
      </button>

      {assistantOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-[#002018]/40"
            aria-label="Close assistant"
            onClick={() => setAssistantOpen(false)}
          />
          <div className="relative flex h-full w-full max-w-none flex-col overflow-y-auto bg-[#f1f3f2] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-medium text-[#002018]">AI Job Assistant</p>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full text-[#002018] hover:bg-white"
                aria-label="Close"
                onClick={() => setAssistantOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <AiJobAssistant
              topMatch={topMatch}
              matchCount={matches.length}
              onMatchesUpdated={() => void home.refetch()}
            />
          </div>
        </div>
      ) : null}
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
    <article className="flex flex-col rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)] sm:p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e7f6ef] font-serif text-base text-[#002018] sm:size-10 sm:text-sm">
          {(job.company || 'A').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base text-muted-foreground sm:text-sm">{job.company}</p>
            {featured ? (
              <span className="rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-semibold text-[#c47b12] sm:text-[0.65rem]">
                Featured
              </span>
            ) : null}
          </div>
          <Link to={`/app/jobs/${job.id}`} className="mt-1 block">
            <h3 className="font-serif text-[1.05rem] leading-snug text-[#002018] hover:text-[#2f9a6f] sm:text-lg">
              {job.title}
            </h3>
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 text-base text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-1 sm:text-xs">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0 sm:size-3" />
          {place}
        </span>
        <span>{moneyBand(job.salaryMin, job.salaryMax, job.currency)}</span>
        <span>{postedLabel(job.postedAt)}</span>
      </div>

      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-2 sm:gap-1.5">
          {skills.map((skill) => (
            <span key={skill} className="rounded-full bg-[#eef2f0] px-3 py-1 text-sm text-[#002018] sm:px-2 sm:py-0.5 sm:text-[0.7rem]">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-[#2f9a6f] sm:text-sm">
        <CheckCircle2 className="size-4 shrink-0" />
        Matched {match.score}%
      </p>

      <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className={cn('h-10 w-full rounded-full sm:h-9 sm:flex-1', saved && 'border-[#2f9a6f] text-[#2f9a6f]')}
          onClick={onSave}
        >
          <Bookmark className={cn('size-3.5', saved && 'fill-current')} />
          {saved ? 'Saved' : 'Save'}
        </Button>
        <Button
          className="h-10 w-full rounded-full bg-[#002018] !text-white hover:bg-[#001510] sm:h-9 sm:flex-1"
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
    green: 'bg-[#e7f6ef] text-[#2f9a6f]',
    orange: 'bg-[#fff4e5] text-[#c47b12]',
    violet: 'bg-[#f1e8ff] text-[#7b5cb0]',
    blue: 'bg-[#eaf2ff] text-[#3b6fd8]',
  }
  const hints = {
    green: 'text-[#2f9a6f]',
    orange: 'text-[#c47b12]',
    violet: 'text-[#2f9a6f]',
    blue: 'text-[#2f9a6f]',
  }
  return (
    <div className="rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)] sm:p-4">
      <span className={cn('grid size-10 place-items-center rounded-xl sm:size-9', tones[tone])}>
        <Icon className="size-4" />
      </span>
      <p className="mt-3 font-serif text-3xl tabular-nums text-[#002018] sm:text-3xl">{value}</p>
      <p className="text-base font-medium text-[#002018] sm:text-sm sm:font-normal sm:text-muted-foreground">{label}</p>
      {hint ? <p className={cn('mt-1 text-sm sm:text-xs', hints[tone])}>{hint}</p> : null}
    </div>
  )
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
    <div className="rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)]">
      <span className="grid size-10 place-items-center rounded-xl bg-[#e7f6ef] text-[#2f9a6f] sm:size-9">
        <Icon className="size-4" />
      </span>
      <h3 className="mt-3 text-base font-semibold text-[#002018] sm:text-[0.9375rem] sm:font-medium">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground sm:mt-1 sm:text-sm">{body}</p>
      <Link to={href} className="mt-3 inline-block text-base font-medium text-[#2f9a6f] hover:underline sm:text-sm">
        {link}
      </Link>
    </div>
  )
}

function DashboardRailCard({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_10px_24px_rgba(19,38,31,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[0.65rem]">
        {title}
      </p>
      {children ?? <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-sm">{empty}</p>}
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

function buildInsights(matches: JobMatch[], profileSkills: string[], coach?: CareerInsights | null) {
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
  const trend = coach?.strategy
    || (matches.length
      ? `${strong} of ${matches.length} scored roles are 70%+ AI fits right now.`
      : 'Run the AI Job Assistant to see how your market is moving.')

  return {
    skills: coach?.gaps?.length ? coach.gaps.slice(0, 5) : skills,
    salary: salary || (coach?.focusTitle ? `Focus title: ${coach.focusTitle}` : ''),
    trend,
  }
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
