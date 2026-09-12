import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Handshake,
  Inbox,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import type { Job } from '@shared/types'
import { api } from '@/lib/api'
import { cn, initials, prettyStatus, postedLabel } from '@/lib/utils'
import { localBrandPath } from '@/lib/brandAssets'
import { JobConfirmDialog } from '@/components/employer/JobConfirmDialog'
import { isJobClosed } from '@/components/employer/jobListing'
import { JobManageMenu } from '@/components/employer/JobManageMenu'
import { useEmployerJobActions } from '@/components/employer/useEmployerJobActions'

interface InboxRow {
  id: string
  status: string
  candidateName?: string
  candidateEmail?: string
  candidateHeadline?: string
  submittedAt?: string
  job?: Job
}

export function PortalHome() {
  const jobs = useQuery({ queryKey: ['employer-jobs'], queryFn: () => api<Job[]>('/api/employer/jobs') })
  const inbox = useQuery({
    queryKey: ['employer-inbox'],
    queryFn: () => api<InboxRow[]>('/api/employer/applications'),
  })
  const roles = jobs.data ?? []
  const list = inbox.data ?? []
  const activeRoles = roles.filter((job) => !isJobClosed(job))
  const hired = list.filter((a) => a.status === 'offer' || a.status === 'hired')
  const { confirm, error: actionError, busy, ask, cancelConfirm, runConfirm } = useEmployerJobActions()
  const skillCounts = skillDemand(roles)
  const weeks = insightWeeks(list)
  const applicantDelta = periodDelta(list.map((a) => a.submittedAt))
  const hiredDelta = periodDelta(hired.map((a) => a.submittedAt))
  const jobDelta = periodDelta(roles.map((j) => j.postedAt))

  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <section className="overflow-hidden rounded-2xl border border-[#dce8e0] bg-gradient-to-r from-[#e7f3ea] via-[#eef6f0] to-white shadow-[0_10px_24px_rgba(19,38,31,0.05)]">
        <div className="grid items-center lg:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.7fr)]">
          <div className="p-4 sm:p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#147a48]">
              Build. Hire. Grow.
            </p>
            <h1 className="mt-1.5 font-serif text-2xl leading-tight text-[var(--forest)] sm:text-[1.85rem]">
              Find the right talent, faster with AI.
            </h1>
            <p className="desk-hero-extra mt-1.5 max-w-lg text-sm leading-relaxed text-[#4d5a54]">
              Post a job, get matched with qualified candidates, and build your team with confidence. Packets arrive
              only after they approve.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/employer/jobs/new"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#147a48] px-4 text-sm font-medium !text-white hover:bg-[#0f5e37]"
              >
                <Plus className="size-4 text-white" />
                Post a Job
              </Link>
              <Link
                to="/employer/candidates"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--forest)] bg-white px-4 text-sm font-medium text-[var(--forest)] hover:bg-[#eef3f0]"
              >
                <Search className="size-4" />
                Find Candidates
              </Link>
            </div>
          </div>
          <div className="desk-hero-photo relative hidden h-32 p-3 sm:block lg:h-[10.5rem] lg:p-3">
            <img
              src={localBrandPath('employer-hero.jpg', 'employer')}
              alt=""
              className="h-full w-full rounded-2xl object-cover object-center"
            />
            <div className="absolute left-4 top-4 hidden max-w-[9.5rem] rounded-xl bg-[#147a48] p-2 text-white shadow-lg xl:block">
              <Sparkles className="size-3.5" />
              <p className="mt-1 text-[0.7rem] font-medium leading-snug">AI matched candidates</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Total Candidates" value={list.length} hint={applicantDelta} />
        <StatCard icon={Briefcase} label="Active Jobs" value={activeRoles.length} hint={jobDelta} />
        <StatCard icon={Inbox} label="Total Applicants" value={list.length} hint={applicantDelta} />
        <StatCard icon={Handshake} label="Hired" value={hired.length} hint={hiredDelta} />
        <Link
          to="/employer/jobs/new"
          className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-[#e4ebe6] bg-white p-5 text-[var(--forest)] shadow-[0_10px_28px_rgba(19,38,31,0.04)]"
        >
          <div>
            <Target className="size-5 text-[#147a48]" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Post a job today and let AI find the best candidates for you.</p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f3ec] text-[#147a48]">
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <Panel
          id="applicants"
          title="Recent Applicants"
          action={
            <Link to="/employer/inbox" className="text-sm font-medium text-[#147a48] hover:underline">
              View all
            </Link>
          }
        >
          {list.length ? (
            <ul className="divide-y divide-[#eef3f0]">
              {list.slice(0, 5).map((a) => (
                <li key={a.id} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e8f3ec] font-serif text-sm text-[var(--forest)]">
                    {initials(a.candidateName || a.candidateEmail || 'C')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--forest)]">{a.candidateName || a.candidateEmail}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.candidateHeadline || a.job?.title || 'Applicant'}</p>
                    {a.job?.skills?.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {a.job.skills.slice(0, 2).map((skill) => (
                          <span key={skill} className="rounded-full bg-[#eef3f0] px-2 py-0.5 text-[0.65rem] text-[var(--forest)]">
                            {skill}
                          </span>
                        ))}
                        {a.job.skills.length > 2 ? (
                          <span className="rounded-full bg-[#eef3f0] px-2 py-0.5 text-[0.65rem] text-muted-foreground">
                            +{a.job.skills.length - 2}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium text-[#147a48]">{prettyStatus(a.status)}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{ago(a.submittedAt)}</p>
                  </div>
                  <Link
                    to={`/employer/inbox?${new URLSearchParams({
                      id: a.id,
                      ...(a.job?.id ? { job: a.job.id } : {}),
                    }).toString()}`}
                    className="rounded-full border border-[#d7ddd8] px-3 py-1.5 text-xs font-medium text-[var(--forest)] hover:border-[var(--forest)]"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyLine text="No packets yet. Post a job so matched candidates can apply on Atelier." />
          )}
        </Panel>

        <Panel
          title="Your Job Posts"
          action={
            <Link to="/employer/jobs" className="text-sm font-medium text-[#147a48] hover:underline">
              View all
            </Link>
          }
        >
          {roles.length ? (
            <ul className="space-y-3">
              {roles.slice(0, 4).map((job) => {
                const count = list.filter((a) => a.job?.id === job.id).length
                const closed = isJobClosed(job)
                return (
                  <li key={job.id} className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f3ec] text-[var(--forest)]">
                      <Briefcase className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--forest)]">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {postedLabel(job.postedAt)} · {count} {count === 1 ? 'applicant' : 'applicants'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[0.65rem] font-medium',
                        closed ? 'bg-[#eef3f0] text-muted-foreground' : 'bg-[#e8f3ec] text-[#147a48]',
                      )}
                    >
                      {closed ? 'Closed' : 'Active'}
                    </span>
                    <JobManageMenu
                      job={job}
                      applicants={count}
                      align="left"
                      onAction={(action) => ask(job.id, job.title, action, count)}
                    />
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyLine text="No roles yet. Publish one to appear in candidate search." />
          )}
        </Panel>
      </div>

      {confirm ? (
        <JobConfirmDialog
          title={confirm.title}
          action={confirm.action}
          applicants={confirm.applicants}
          error={actionError}
          busy={busy}
          onCancel={cancelConfirm}
          onConfirm={runConfirm}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Hiring Insights">
          <InsightChart weeks={weeks} />
        </Panel>
        <Panel title="Top Skills in Demand">
          {skillCounts.length ? (
            <ul className="space-y-3">
              {skillCounts.slice(0, 5).map((row) => (
                <li key={row.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--forest)]">{row.name}</span>
                    <span className="tabular-nums text-muted-foreground">{row.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef3f0]">
                    <div className="h-full rounded-full bg-[#147a48]" style={{ width: `${row.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyLine text="Skills appear from the roles you post." />
          )}
        </Panel>
        <Panel title="Quick Actions">
          <div className="grid grid-cols-2 gap-2.5">
            <Action to="/employer/jobs/new" icon={Plus} label="Post a Job" hint="Reach top talent" tone="forest" />
            <Action to="/employer/candidates" icon={Search} label="Find Candidates" hint="Browse & connect" tone="sage" />
            <Action to="/employer/messages" icon={Send} label="Messages" hint="Talk after they apply" tone="copper" />
            <Action to="/employer/finances" icon={BarChart3} label="View Reports" hint="Track hiring pay" tone="gold" />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Panel({
  id,
  title,
  action,
  children,
  className,
}: {
  id?: string
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn('rounded-[1.4rem] border border-[#e4ebe6] bg-white p-5 shadow-[0_10px_28px_rgba(19,38,31,0.04)]', className)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-[var(--forest)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="rounded-[1.4rem] border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_28px_rgba(19,38,31,0.04)]">
      <span className="grid size-9 place-items-center rounded-xl bg-[#e8f3ec] text-[#147a48]">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 font-serif text-3xl tabular-nums text-[var(--forest)]">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="mt-2 text-xs font-medium text-[#147a48]">{hint}</p> : null}
    </div>
  )
}

function Action({
  to,
  icon: Icon,
  label,
  hint,
  tone,
}: {
  to: string
  icon: typeof Plus
  label: string
  hint: string
  tone: 'forest' | 'sage' | 'copper' | 'gold'
}) {
  const tones = {
    forest: 'bg-[#e8f3ec] text-[#147a48]',
    sage: 'bg-[#eef3f0] text-[var(--forest)]',
    copper: 'bg-[#f7ece6] text-[var(--copper)]',
    gold: 'bg-[#f7f1e4] text-[#9a7a32]',
  }
  return (
    <Link to={to} className="rounded-2xl border border-[#eef3f0] p-3 hover:border-[#c9d6ce]">
      <span className={cn('grid size-9 place-items-center rounded-xl', tones[tone])}>
        <Icon className="size-4" />
      </span>
      <p className="mt-2 text-sm font-medium text-[var(--forest)]">{label}</p>
      <p className="text-[0.65rem] text-muted-foreground">{hint}</p>
    </Link>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-6 text-sm leading-relaxed text-muted-foreground">{text}</p>
}

function InsightChart({ weeks }: { weeks: { label: string; applicants: number; hired: number }[] }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.applicants, w.hired]))
  const w = 320
  const h = 140
  const pad = 8
  function line(key: 'applicants' | 'hired') {
    return weeks
      .map((row, i) => {
        const x = pad + (i / Math.max(weeks.length - 1, 1)) * (w - pad * 2)
        const y = h - pad - (row[key] / max) * (h - pad * 2)
        return `${i === 0 ? 'M' : 'L'}${x},${y}`
      })
      .join(' ')
  }
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-[#147a48]" /> Applicants
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-[#c6a15b]" /> Hired
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" aria-hidden>
        <path d={line('applicants')} fill="none" stroke="#147a48" strokeWidth="2.5" />
        <path d={line('hired')} fill="none" stroke="#c6a15b" strokeWidth="2.5" />
      </svg>
      <div className="mt-1 flex justify-between text-[0.65rem] text-muted-foreground">
        {weeks.map((row) => (
          <span key={row.label}>{row.label}</span>
        ))}
      </div>
    </div>
  )
}

function ago(iso?: string) {
  if (!iso) return 'Recently'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'Recently'
  const hours = Math.round((Date.now() - then) / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function periodDelta(dates: (string | undefined)[]) {
  const now = Date.now()
  const day = 86_400_000
  const recent = dates.filter((d) => d && now - new Date(d).getTime() <= 30 * day).length
  const prior = dates.filter((d) => {
    if (!d) return false
    const age = now - new Date(d).getTime()
    return age > 30 * day && age <= 60 * day
  }).length
  if (!recent && !prior) return undefined
  if (!prior) return recent ? `+${recent} last 30 days` : undefined
  const pct = Math.round(((recent - prior) / prior) * 100)
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}% vs last 30 days`
}

function skillDemand(jobs: Job[]) {
  const counts = new Map<string, number>()
  for (const job of jobs) {
    for (const skill of job.skills ?? []) {
      const name = skill.trim()
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  const total = [...counts.values()].reduce((n, v) => n + v, 0) || 1
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, pct: Math.round((n / total) * 100) }))
}

function insightWeeks(list: InboxRow[]) {
  const weeks: { start: number; label: string; applicants: number; hired: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(now)
    start.setDate(now.getDate() - i * 7)
    start.setHours(0, 0, 0, 0)
    weeks.push({
      start: start.getTime(),
      label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      applicants: 0,
      hired: 0,
    })
  }
  for (const row of list) {
    const t = row.submittedAt ? new Date(row.submittedAt).getTime() : 0
    const bucket = [...weeks].reverse().find((w) => t >= w.start)
    if (!bucket) continue
    bucket.applicants += 1
    if (row.status === 'hired' || row.status === 'offer') bucket.hired += 1
  }
  return weeks
}
