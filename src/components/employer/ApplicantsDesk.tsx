import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Briefcase,
  Eye,
  GraduationCap,
  Link2,
  MapPin,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import type { CareerLevel, Currency, EmploymentType, Job } from '@shared/types'
import { api } from '@/lib/api'
import { cn, initials, money, moneyBand, prettyStatus, postedLabel, textSnippet } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { JobConfirmDialog } from '@/components/employer/JobConfirmDialog'
import { JobIcon } from '@/components/employer/JobIcon'
import { isJobClosed } from '@/components/employer/jobListing'
import { JobManageMenu } from '@/components/employer/JobManageMenu'
import { useEmployerJobActions } from '@/components/employer/useEmployerJobActions'

interface InboxRow {
  id: string
  status: string
  candidateName?: string
  candidateEmail?: string
  candidateHeadline?: string
  candidateTitle?: string
  candidateCity?: string
  candidateCountry?: string
  candidateLocation?: string
  yearsExperience?: number
  careerLevel?: CareerLevel
  avatarUrl?: string
  skills?: string[]
  salaryMin?: number
  salaryDesired?: number
  currency?: Currency
  remoteWorldwide?: boolean
  workModes?: string[]
  bio?: string
  socialLinks?: Record<string, string>
  submittedAt?: string
  createdAt?: string
  matchScore?: number
  matchedSkills?: string[]
  events?: { at: string; label: string; detail: string }[]
  packet: {
    tailoredResume: string
    coverLetter: string
    answers: { question: string; answer: string }[]
    recruiterMessage: string
  }
  job?: Job
}

type StatusBucket = 'all' | 'new' | 'review' | 'shortlisted' | 'interview' | 'hired' | 'rejected'
type ExperienceFilter = 'entry' | 'intermediate' | 'expert'
type SortKey = 'match' | 'latest' | 'oldest'
type DetailTab = 'overview' | 'resume' | 'letter' | 'activity'

const PAGE = 8

const STATUS_FILTERS: { id: StatusBucket; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'review', label: 'Under Review' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview', label: 'Interviewed' },
  { id: 'hired', label: 'Hired' },
  { id: 'rejected', label: 'Rejected' },
]

function experienceBucket(row: InboxRow): ExperienceFilter {
  if (row.careerLevel === 'junior' || (row.yearsExperience ?? 0) < 3) return 'entry'
  if (row.careerLevel === 'senior' || row.careerLevel === 'lead' || row.careerLevel === 'manager' || (row.yearsExperience ?? 0) >= 7) {
    return 'expert'
  }
  return 'intermediate'
}

function locationKey(row: InboxRow) {
  const place = `${row.candidateCountry || ''} ${row.candidateCity || ''} ${row.candidateLocation || ''}`.toLowerCase()
  if (/philippines|manila|cebu|davao/.test(place)) return 'Philippines'
  if (/united states|usa|u\.s\.|new york|california/.test(place)) return 'United States'
  if (/canada|toronto|vancouver/.test(place)) return 'Canada'
  if (/united kingdom|uk|london|england/.test(place)) return 'United Kingdom'
  if (row.candidateCountry || row.candidateCity) return 'Other'
  return ''
}

function availabilityLabel(row: InboxRow) {
  if (row.remoteWorldwide || row.workModes?.includes('remote')) return 'Available Now'
  if (row.workModes?.includes('hybrid')) return 'Hybrid'
  return 'Open to Opportunities'
}

export function ApplicantsDesk() {
  const qc = useQueryClient()
  const routeParams = useParams()
  const [params, setParams] = useSearchParams()
  const jobId = params.get('job') ?? ''
  const selectedId = params.get('id') ?? routeParams.id ?? ''
  const query = params.get('q') ?? ''
  const [statusFilter, setStatusFilter] = useState<StatusBucket>('all')
  const [experience, setExperience] = useState<ExperienceFilter[]>([])
  const [places, setPlaces] = useState<string[]>([])
  const [skillFilter, setSkillFilter] = useState('')
  const [skillDraft, setSkillDraft] = useState('')
  const [sort, setSort] = useState<SortKey>('match')
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState<DetailTab>('overview')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { confirm, error: actionError, busy, ask, cancelConfirm, runConfirm } = useEmployerJobActions()

  const jobs = useQuery({ queryKey: ['employer-jobs'], queryFn: () => api<Job[]>('/api/employer/jobs') })
  const inbox = useQuery({
    queryKey: ['employer-inbox'],
    queryFn: () => api<InboxRow[]>('/api/employer/applications'),
  })

  const activeJobId =
    jobId ||
    (jobs.data ?? []).find((job) => (inbox.data ?? []).some((row) => row.job?.id === job.id))?.id ||
    jobs.data?.[0]?.id ||
    ''
  const roles = jobs.data ?? []
  const job = roles.find((row) => row.id === activeJobId)

  const forJob = useMemo(() => {
    const all = inbox.data ?? []
    let rows = activeJobId ? all.filter((row) => row.job?.id === activeJobId) : all
    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter((row) => {
        const hay = [
          row.candidateName,
          row.candidateEmail,
          row.candidateHeadline,
          row.candidateTitle,
          row.candidateLocation,
          row.bio,
          row.job?.title,
          ...(row.matchedSkills ?? []),
          ...(row.skills ?? []),
          row.packet.coverLetter,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((row) => statusBucket(row.status) === statusFilter)
    }
    if (experience.length) {
      rows = rows.filter((row) => experience.includes(experienceBucket(row)))
    }
    if (places.length) {
      rows = rows.filter((row) => places.includes(locationKey(row)))
    }
    const skill = skillFilter.trim().toLowerCase()
    if (skill) {
      rows = rows.filter((row) =>
        (row.matchedSkills ?? row.skills ?? row.job?.skills ?? []).some((s) => s.toLowerCase().includes(skill)),
      )
    }
    rows = [...rows].sort((a, b) => {
      if (sort === 'match') return (b.matchScore ?? 0) - (a.matchScore ?? 0)
      const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
      const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
      return sort === 'oldest' ? at - bt : bt - at
    })
    return rows
  }, [inbox.data, activeJobId, query, statusFilter, experience, places, skillFilter, sort])

  const all = inbox.data ?? []

  const counts = useMemo(() => {
    const rows = inbox.data ?? []
    const base = activeJobId ? rows.filter((row) => row.job?.id === activeJobId) : rows
    return {
      total: base.length,
      review: base.filter((row) => ['submitted', 'under_review'].includes(row.status)).length,
      shortlisted: base.filter((row) => row.status === 'offer').length,
      hired: base.filter((row) => ['hired', 'completed'].includes(row.status)).length,
    }
  }, [inbox.data, activeJobId])

  const statusCounts = useMemo(() => {
    const rows = inbox.data ?? []
    const base = activeJobId ? rows.filter((row) => row.job?.id === activeJobId) : rows
    const tally = (id: StatusBucket) =>
      id === 'all' ? base.length : base.filter((row) => statusBucket(row.status) === id).length
    return Object.fromEntries(STATUS_FILTERS.map((f) => [f.id, tally(f.id)])) as Record<StatusBucket, number>
  }, [inbox.data, activeJobId])

  const experienceCounts = useMemo(() => {
    const rows = inbox.data ?? []
    const base = activeJobId ? rows.filter((row) => row.job?.id === activeJobId) : rows
    return {
      entry: base.filter((row) => experienceBucket(row) === 'entry').length,
      intermediate: base.filter((row) => experienceBucket(row) === 'intermediate').length,
      expert: base.filter((row) => experienceBucket(row) === 'expert').length,
    }
  }, [inbox.data, activeJobId])

  const locationCounts = useMemo(() => {
    const rows = inbox.data ?? []
    const base = activeJobId ? rows.filter((row) => row.job?.id === activeJobId) : rows
    const tally: Record<string, number> = {
      Philippines: 0,
      'United States': 0,
      Canada: 0,
      'United Kingdom': 0,
      Other: 0,
    }
    for (const row of base) {
      const key = locationKey(row)
      if (key) tally[key] = (tally[key] ?? 0) + 1
    }
    return tally
  }, [inbox.data, activeJobId])

  const pages = Math.max(1, Math.ceil(forJob.length / PAGE))
  const slice = forJob.slice(page * PAGE, page * PAGE + PAGE)
  const selected = forJob.find((row) => row.id === selectedId) ?? all.find((row) => row.id === selectedId) ?? null

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/employer/applications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employer-inbox'] })
      setMenuId(null)
    },
  })

  function setSearch(value: string) {
    const next = new URLSearchParams(params)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    if (activeJobId) next.set('job', activeJobId)
    setParams(next, { replace: true })
    setPage(0)
  }

  function openRow(id: string) {
    const next = new URLSearchParams(params)
    if (activeJobId) next.set('job', activeJobId)
    next.set('id', id)
    setParams(next, { replace: true })
    setTab('overview')
    setMenuId(null)
  }

  function pickJob(id: string) {
    const next = new URLSearchParams(params)
    next.set('job', id)
    next.delete('id')
    setParams(next, { replace: true })
    setPage(0)
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setExperience([])
    setPlaces([])
    setSkillFilter('')
    setSkillDraft('')
    setPage(0)
  }

  function toggleExperience(id: ExperienceFilter) {
    setExperience((cur) => (cur.includes(id) ? cur.filter((row) => row !== id) : [...cur, id]))
    setPage(0)
  }

  function togglePlace(id: string) {
    setPlaces((cur) => (cur.includes(id) ? cur.filter((row) => row !== id) : [...cur, id]))
    setPage(0)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/employer" className="hover:text-foreground">
              Employer
            </Link>
            <span className="px-1.5">›</span>
            <span className="text-foreground">Applicants</span>
          </p>
          <h1 className="mt-1 font-serif text-2xl leading-tight text-[var(--forest)] sm:text-3xl">Applicants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review applications, find the best talent, and hire with confidence.
          </p>
        </div>
        <Button variant="outline" className="rounded-full" asChild>
          <Link to="/employer/jobs">
            <ArrowLeft className="size-4" />
            Back to My Jobs
          </Link>
        </Button>
      </div>

      {job ? (
        <div className="rounded-2xl border border-[#e4ebe6] bg-white px-4 py-4 shadow-[0_12px_32px_rgba(19,38,31,0.04)] sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <JobIcon
                title={job.title}
                category={job.skills[0] || 'Role'}
                className="size-11 shrink-0"
                iconClassName="size-5"
              />
              <div className="min-w-0">
                {roles.length > 1 ? (
                  <select
                    className="max-w-full bg-transparent font-serif text-xl text-[var(--forest)] outline-none"
                    value={activeJobId}
                    onChange={(e) => pickJob(e.target.value)}
                  >
                    {roles.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <h2 className="font-serif text-xl text-[var(--forest)] sm:text-2xl">{job.title}</h2>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{job.skills[0] || typeLabel(job.employmentType)}</span>
                  <span>·</span>
                  <span>{typeLabel(job.employmentType)}</span>
                  <span>·</span>
                  <span>{postedLabel(job.postedAt)}</span>
                  {isJobClosed(job) ? <span className="rounded-full bg-[#eef3f0] px-2 py-0.5">Closed</span> : null}
                </div>
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-5">
              <InlineStat value={counts.total} label="Total Applicants" />
              <InlineStat value={counts.review} label="Under Review" />
              <InlineStat value={counts.shortlisted} label="Shortlisted" />
              <InlineStat value={counts.hired} label="Hired" />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link to={`/employer/jobs/${encodeURIComponent(job.id)}/edit`}>View Job Details</Link>
                </Button>
                <JobManageMenu
                  job={job}
                  applicants={counts.total}
                  onAction={(action) => ask(job.id, job.title, action, counts.total)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : roles.length ? (
        <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4">
          <label className="block text-sm text-muted-foreground">
            Job
            <select
              className="mt-1.5 h-10 w-full max-w-md rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm text-[var(--forest)]"
              value={activeJobId}
              onChange={(e) => pickJob(e.target.value)}
            >
              {roles.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 xl:hidden">
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal className="size-4" />
          Filters
        </Button>
        {forJob.length ? (
          <p className="text-sm text-muted-foreground">{forJob.length} applicants</p>
        ) : null}
      </div>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_22rem]">
        <aside className={cn(
          'space-y-5 rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_8px_24px_rgba(19,38,31,0.04)]',
          filtersOpen ? 'block' : 'hidden xl:block',
        )}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-[var(--forest)]">Filters</p>
            <button type="button" className="text-sm text-[#147a48] hover:underline" onClick={clearFilters}>
              Clear all
            </button>
          </div>
          <label className="block">
            <span className="sr-only">Search applicants</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search applicants…"
                value={query}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>

          <FilterGroup title="Application Status">
            {STATUS_FILTERS.map((f) => (
              <CheckRow
                key={f.id}
                label={f.label}
                count={statusCounts[f.id]}
                checked={statusFilter === f.id}
                onChange={() => {
                  setStatusFilter(f.id)
                  setPage(0)
                }}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Experience Level">
            <CheckRow
              label="All Levels"
              count={counts.total}
              checked={experience.length === 0}
              onChange={() => {
                setExperience([])
                setPage(0)
              }}
            />
            <CheckRow
              label="Entry Level"
              count={experienceCounts.entry}
              checked={experience.includes('entry')}
              onChange={() => toggleExperience('entry')}
            />
            <CheckRow
              label="Intermediate"
              count={experienceCounts.intermediate}
              checked={experience.includes('intermediate')}
              onChange={() => toggleExperience('intermediate')}
            />
            <CheckRow
              label="Expert"
              count={experienceCounts.expert}
              checked={experience.includes('expert')}
              onChange={() => toggleExperience('expert')}
            />
          </FilterGroup>

          <FilterGroup title="Location">
            <CheckRow
              label="All Locations"
              count={counts.total}
              checked={places.length === 0}
              onChange={() => {
                setPlaces([])
                setPage(0)
              }}
            />
            {Object.entries(locationCounts).map(([label, count]) => (
              <CheckRow
                key={label}
                label={label}
                count={count}
                checked={places.includes(label)}
                onChange={() => togglePlace(label)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Skills">
            <div className="flex gap-2">
              <Input
                placeholder="Search skills…"
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setSkillFilter(skillDraft.trim())
                    setPage(0)
                  }
                }}
              />
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#e4ebe6] text-[var(--forest)]"
                onClick={() => {
                  setSkillFilter(skillDraft.trim())
                  setPage(0)
                }}
                aria-label="Apply skill filter"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {skillFilter ? (
              <button
                type="button"
                className="mt-2 rounded-full bg-[#e8f3ec] px-2.5 py-1 text-xs text-[#147a48]"
                onClick={() => {
                  setSkillFilter('')
                  setSkillDraft('')
                }}
              >
                {skillFilter} ×
              </button>
            ) : null}
          </FilterGroup>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#e4ebe6] bg-white shadow-[0_12px_32px_rgba(19,38,31,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef3f0] px-4 py-3">
            <p className="font-medium text-[var(--forest)]">
              {forJob.length} {forJob.length === 1 ? 'Applicant' : 'Applicants'}
            </p>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              Sort by:
              <select
                className="h-9 rounded-lg border border-[#e4ebe6] bg-white px-2 text-sm text-[var(--forest)]"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey)
                  setPage(0)
                }}
              >
                <option value="match">Best Match</option>
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>
          </div>

          {slice.length ? (
            <>
              <ul className="divide-y divide-[#eef3f0]">
                {slice.map((row) => {
                  const on = selected?.id === row.id
                  const name = row.candidateName || row.candidateEmail || 'Candidate'
                  return (
                    <li key={row.id} className={cn('relative', on && 'bg-[#f7faf8]')}>
                      <div className="flex items-start gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                        <input
                          type="checkbox"
                          className="mt-3"
                          checked={on}
                          onChange={() => openRow(row.id)}
                          aria-label={`Select ${name}`}
                        />
                        <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => openRow(row.id)}>
                          <Avatar name={name} src={row.avatarUrl} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium text-[var(--forest)]">{name}</p>
                              {row.matchScore != null && row.matchScore >= 85 ? (
                                <span className="rounded-full bg-[#e8f3ec] px-2 py-0.5 text-[0.65rem] font-medium text-[#147a48]">
                                  Top Match
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              {row.candidateLocation || 'Location not set'}
                            </p>
                            <p className="mt-1 truncate text-sm text-[var(--forest)]">
                              {row.candidateTitle || row.candidateHeadline || row.job?.title || 'Applicant'}
                              {row.yearsExperience ? ` · ${row.yearsExperience} years` : ''}
                            </p>
                            {row.bio || row.packet.coverLetter ? (
                              <p className="mt-1 hidden text-xs leading-relaxed text-muted-foreground sm:block">
                                {textSnippet(row.bio || row.packet.coverLetter, 90)}
                              </p>
                            ) : null}
                          </div>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-1 pt-1 sm:flex-row sm:items-center sm:gap-3">
                          {row.matchScore != null ? (
                            <span className="text-xs font-semibold text-[#147a48] sm:text-sm">{Math.round(row.matchScore)}%</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{prettyStatus(row.status)}</span>
                          )}
                          <span className="hidden text-xs text-muted-foreground md:block">{ago(row.submittedAt)}</span>
                          <div className="flex">
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-[#eef3f0]"
                            onClick={() => openRow(row.id)}
                            aria-label="View applicant"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-[#eef3f0]"
                            onClick={() => setMenuId((cur) => (cur === row.id ? null : row.id))}
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                          </div>
                        </div>
                      </div>
                      {menuId === row.id ? (
                        <div className="absolute right-4 top-12 z-20 w-40 overflow-hidden rounded-xl border border-[#e4ebe6] bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f4f7f5]"
                            onClick={() => update.mutate({ id: row.id, status: 'offer' })}
                          >
                            Shortlist
                          </button>
                          <Link
                            to={`/employer/messages/${row.id}`}
                            className="block px-3 py-2 text-sm hover:bg-[#f4f7f5]"
                            onClick={() => setMenuId(null)}
                          >
                            Message
                          </Link>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-[#b85c38] hover:bg-[#f4f7f5]"
                            onClick={() => update.mutate({ id: row.id, status: 'rejected' })}
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef3f0] px-4 py-3 text-sm text-muted-foreground">
                <p>
                  Showing {forJob.length ? page * PAGE + 1 : 0}–{Math.min(forJob.length, page * PAGE + PAGE)} of {forJob.length}{' '}
                  applicants
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-full border border-[#e4ebe6] disabled:opacity-40"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  {visiblePages(page, pages).map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={cn(
                        'grid size-8 place-items-center rounded-full text-sm',
                        i === page ? 'bg-[#147a48] text-white' : 'text-[var(--forest)] hover:bg-[#eef3f0]',
                      )}
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-full border border-[#e4ebe6] disabled:opacity-40"
                    disabled={page + 1 >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-16 text-center">
              <Users className="mx-auto size-10 text-[#147a48]/60" />
              <p className="mt-3 font-serif text-xl text-[var(--forest)]">
                {all.length ? 'No applicants in this view' : 'No applicants yet'}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {all.length
                  ? 'Try another filter or job.'
                  : 'When a candidate approves a packet for your role, they appear here.'}
              </p>
              {!all.length ? (
                <Button className="mt-5 rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" asChild>
                  <Link to="/employer/jobs/new">Post a job</Link>
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {selectedId ? (
          <button
            type="button"
            className="fixed inset-0 z-[70] bg-[#13261f]/40 xl:hidden"
            aria-label="Close preview"
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('id')
              setParams(next, { replace: true })
            }}
          />
        ) : null}
        <aside className={cn(
          'rounded-2xl border border-[#e4ebe6] bg-white shadow-[0_12px_32px_rgba(19,38,31,0.04)]',
          selectedId
            ? 'fixed inset-x-0 bottom-0 z-[80] max-h-[92vh] overflow-y-auto rounded-t-3xl xl:static xl:z-auto xl:max-h-none xl:overflow-visible xl:rounded-2xl xl:sticky xl:top-24'
            : 'hidden xl:block xl:sticky xl:top-24',
        )}>
          {selected ? (
            <>
              <div className="border-b border-[#eef3f0] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Avatar name={selected.candidateName || selected.candidateEmail || 'C'} src={selected.avatarUrl} large />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-[var(--forest)]">
                        {selected.candidateName || selected.candidateEmail || 'Candidate'}
                        {selected.matchScore != null && selected.matchScore >= 85 ? (
                          <span className="rounded-full bg-[#e8f3ec] px-2 py-0.5 text-[0.65rem] font-medium text-[#147a48]">
                            Top Match
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {selected.candidateLocation || 'Location not set'}
                        </span>
                        <span>{ago(selected.submittedAt)}</span>
                      </p>
                    </div>
                  </div>
                  {selectedId ? (
                    <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => {
                      const next = new URLSearchParams(params)
                      next.delete('id')
                      setParams(next, { replace: true })
                    }} aria-label="Close preview">
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="flex-1 rounded-full bg-[#13261f] hover:bg-[#0d1b16]"
                    disabled={update.isPending || selected.status === 'offer'}
                    onClick={() => update.mutate({ id: selected.id, status: 'offer' })}
                  >
                    <UserCheck className="size-4" />
                    Shortlist
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-full" asChild>
                    <Link to={`/employer/messages/${selected.id}`}>
                      <MessagesSquare className="size-4" />
                      Message
                    </Link>
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {(
                    [
                      ['overview', 'Overview'],
                      ['resume', 'Resume'],
                      ['letter', 'Cover Letter'],
                      ['activity', 'Activity'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'rounded-full px-3 py-1.5 text-sm',
                        tab === id ? 'bg-[#13261f] text-white' : 'text-muted-foreground hover:bg-[#eef3f0]',
                      )}
                      onClick={() => setTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-4 text-sm">
                {tab === 'overview' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">About</p>
                      <p className="mt-2 leading-relaxed text-foreground/90">
                        {textSnippet(selected.bio || selected.packet.coverLetter || selected.packet.recruiterMessage, 320) ||
                          'Open the cover letter tab for the candidate note.'}
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {selected.candidateTitle ? (
                        <li className="flex items-start gap-2">
                          <Briefcase className="mt-0.5 size-4 text-[#147a48]" />
                          <span>{selected.candidateTitle}</span>
                        </li>
                      ) : null}
                      {selected.job?.title ? (
                        <li className="flex items-start gap-2">
                          <GraduationCap className="mt-0.5 size-4 text-[#147a48]" />
                          <span>Applied for {selected.job.title}</span>
                        </li>
                      ) : null}
                      {selected.candidateLocation ? (
                        <li className="flex items-start gap-2">
                          <MapPin className="mt-0.5 size-4 text-[#147a48]" />
                          <span>{selected.candidateLocation}</span>
                        </li>
                      ) : null}
                      {selected.socialLinks
                        ? Object.entries(selected.socialLinks)
                            .filter(([, href]) => href)
                            .slice(0, 3)
                            .map(([label, href]) => (
                              <li key={label} className="flex items-start gap-2">
                                <Link2 className="mt-0.5 size-4 text-[#147a48]" />
                                <a href={href} target="_blank" rel="noreferrer" className="truncate text-[#147a48] hover:underline">
                                  {href.replace(/^https?:\/\//, '')}
                                </a>
                              </li>
                            ))
                        : null}
                    </ul>
                    {(selected.skills?.length || selected.matchedSkills?.length) ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Skills</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(selected.matchedSkills?.length ? selected.matchedSkills : selected.skills ?? []).map((skill) => (
                            <span key={skill} className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-xs text-[var(--forest)]">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-3 border-t border-[#eef3f0] pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Expected Rate</p>
                        <p className="mt-1 font-medium text-[var(--forest)]">
                          {selected.salaryDesired || selected.salaryMin
                            ? money(selected.salaryDesired || selected.salaryMin, selected.currency)
                            : selected.job
                              ? moneyBand(selected.job.salaryMin, selected.job.salaryMax, selected.job.currency)
                              : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Availability</p>
                        <p className="mt-1 font-medium text-[#147a48]">{availabilityLabel(selected)}</p>
                      </div>
                    </div>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Update status</span>
                      <select
                        className="mt-2 h-10 w-full rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm"
                        value={selected.status}
                        onChange={(e) => update.mutate({ id: selected.id, status: e.target.value })}
                      >
                        {['submitted', 'under_review', 'interview', 'offer', 'hired', 'rejected', 'completed'].map((s) => (
                          <option key={s} value={s}>
                            {prettyStatus(s)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                {tab === 'resume' ? (
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
                    {selected.packet.tailoredResume || 'No resume in this packet yet.'}
                  </pre>
                ) : null}

                {tab === 'letter' ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                    {selected.packet.coverLetter || 'No cover letter in this packet yet.'}
                  </p>
                ) : null}

                {tab === 'activity' ? (
                  <ul className="space-y-3">
                    {(selected.events ?? []).length ? (
                      selected.events!.map((event, i) => (
                        <li key={`${event.at}-${i}`} className="rounded-xl border border-[#eef3f0] p-3">
                          <p className="font-medium text-[var(--forest)]">{event.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
                          <p className="mt-1 text-[0.65rem] text-muted-foreground">{ago(event.at)}</p>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No activity logged yet.</li>
                    )}
                  </ul>
                ) : null}
              </div>
            </>
          ) : (
            <div className="px-5 py-16 text-center">
              <p className="font-serif text-xl text-[var(--forest)]">Select an applicant</p>
              <p className="mt-2 text-sm text-muted-foreground">Preview their packet, shortlist, or send a message.</p>
            </div>
          )}
        </aside>
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
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--forest)]">{title}</p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  )
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string
  count: number
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="flex-1 text-[var(--forest)]">{label}</span>
      <span className="tabular-nums text-muted-foreground">({count})</span>
    </label>
  )
}

function InlineStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[4.5rem]">
      <p className="font-serif text-2xl tabular-nums text-[var(--forest)]">{value}</p>
      <p className="text-[0.7rem] text-muted-foreground">{label}</p>
    </div>
  )
}

function Avatar({ name, src, large }: { name: string; src?: string; large?: boolean }) {
  const size = large ? 'size-14' : 'size-11'
  if (src) return <img src={src} alt="" className={cn(size, 'shrink-0 rounded-full object-cover')} />
  return (
    <span className={cn(size, 'grid shrink-0 place-items-center rounded-full bg-[#e8f3ec] font-serif text-sm text-[var(--forest)]')}>
      {initials(name)}
    </span>
  )
}

function typeLabel(value?: EmploymentType) {
  if (value === 'contract') return 'Fixed Price'
  if (value === 'freelance') return 'Hourly'
  if (value === 'full-time') return 'Ongoing'
  return (value || 'full-time').replaceAll('-', ' ')
}

function statusBucket(status: string): StatusBucket {
  if (status === 'submitted') return 'new'
  if (status === 'under_review') return 'review'
  if (status === 'interview') return 'interview'
  if (status === 'offer') return 'shortlisted'
  if (status === 'hired' || status === 'completed') return 'hired'
  if (status === 'rejected') return 'rejected'
  return 'review'
}

function visiblePages(current: number, total: number) {
  const windowSize = Math.min(total, 5)
  const start = Math.min(Math.max(0, current - 2), Math.max(0, total - windowSize))
  return Array.from({ length: windowSize }, (_, i) => start + i)
}

function ago(iso?: string) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const mins = Math.round((Date.now() - then) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
