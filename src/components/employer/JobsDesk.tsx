import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  Filter,
  Megaphone,
  MoreHorizontal,
  Palette,
  PenLine,
  Plus,
  Smartphone,
  Users,
  X,
} from 'lucide-react'
import type { Job } from '@shared/types'
import { api } from '@/lib/api'
import { cn, initials, moneyBand } from '@/lib/utils'
import { localBrandPath } from '@/lib/brandAssets'
import { Button } from '@/components/ui/button'
import { DRAFT_KEY } from '@/components/employer/PostJobWizard'

interface InboxRow {
  id: string
  status: string
  candidateName?: string
  candidateEmail?: string
  submittedAt?: string
  job?: Job
}

type Tab = 'all' | 'active' | 'hired' | 'closed' | 'drafts'
type SortKey = 'latest' | 'oldest' | 'applicants'
type ConfirmAction = 'close' | 'reopen' | 'delete'

const PAGE = 8

export function JobsDesk() {
  const qc = useQueryClient()
  const jobs = useQuery({ queryKey: ['employer-jobs'], queryFn: () => api<Job[]>('/api/employer/jobs') })
  const inbox = useQuery({
    queryKey: ['employer-inbox'],
    queryFn: () => api<InboxRow[]>('/api/employer/applications'),
  })
  const [tab, setTab] = useState<Tab>('all')
  const [sort, setSort] = useState<SortKey>('latest')
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState('all')
  const [banner, setBanner] = useState(() => sessionStorage.getItem('atelier-jobs-banner') !== 'off')
  const [filterOpen, setFilterOpen] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; title: string; action: ConfirmAction; applicants: number } | null>(
    null,
  )
  const [actionError, setActionError] = useState('')

  const roles = jobs.data ?? []
  const list = inbox.data ?? []
  const draft = readDraft()
  const hasDraft = Boolean(draft?.title?.trim())
  const hiredApps = list.filter((a) => a.status === 'offer' || a.status === 'hired' || a.status === 'completed')
  const waiting = list.filter((a) => a.status === 'submitted' || a.status === 'under_review')

  const rows = useMemo(() => {
    const byJob = new Map<string, InboxRow[]>()
    for (const row of list) {
      const id = row.job?.id
      if (!id) continue
      const cur = byJob.get(id) ?? []
      cur.push(row)
      byJob.set(id, cur)
    }
    let next = roles.map((job) => {
      const apps = byJob.get(job.id) ?? []
      const hired = apps.some((a) => a.status === 'offer' || a.status === 'hired' || a.status === 'completed')
      return { job, apps, hired, kind: 'live' as const }
    })
    if (typeFilter !== 'all') next = next.filter((row) => (row.job.employmentType || 'full-time') === typeFilter)
    if (tab === 'active') next = next.filter((row) => !row.hired && !isClosed(row.job))
    if (tab === 'hired') next = next.filter((row) => row.hired)
    if (tab === 'closed') next = next.filter((row) => isClosed(row.job))
    if (tab === 'drafts') next = []
    next.sort((a, b) => {
      if (sort === 'applicants') return b.apps.length - a.apps.length
      const at = a.job.postedAt ? new Date(a.job.postedAt).getTime() : 0
      const bt = b.job.postedAt ? new Date(b.job.postedAt).getTime() : 0
      return sort === 'oldest' ? at - bt : bt - at
    })
    return next
  }, [roles, list, tab, sort, typeFilter])

  const shown = tab === 'drafts' ? [] : rows.slice(page * PAGE, page * PAGE + PAGE)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const closedCount = roles.filter(isClosed).length
  const activeCount = roles.filter((job) => {
    if (isClosed(job)) return false
    const apps = list.filter((a) => a.job?.id === job.id)
    return !apps.some((a) => a.status === 'offer' || a.status === 'hired' || a.status === 'completed')
  }).length
  const hiredJobCount = roles.filter((job) => {
    const apps = list.filter((a) => a.job?.id === job.id)
    return apps.some((a) => a.status === 'offer' || a.status === 'hired' || a.status === 'completed')
  }).length

  const patchJob = useMutation({
    mutationFn: ({ id, listingStatus }: { id: string; listingStatus: 'active' | 'closed' }) =>
      api(`/api/employer/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ listingStatus }) }),
    onSuccess: async () => {
      setActionError('')
      setConfirm(null)
      setMenuId(null)
      await qc.invalidateQueries({ queryKey: ['employer-jobs'] })
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Could not update the listing.'),
  })

  const deleteJob = useMutation({
    mutationFn: (id: string) => api(`/api/employer/jobs/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setActionError('')
      setConfirm(null)
      setMenuId(null)
      await qc.invalidateQueries({ queryKey: ['employer-jobs'] })
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Could not delete the job.'),
  })

  function closeBanner() {
    sessionStorage.setItem('atelier-jobs-banner', 'off')
    setBanner(false)
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        <Link to="/employer" className="hover:text-foreground">
          Employer
        </Link>
        <span className="px-1.5">›</span>
        <span className="text-foreground">My Jobs</span>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl leading-tight text-[var(--forest)]">My Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your job postings, track applicants, and find the right talent.
          </p>
        </div>
        <Button className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" asChild>
          <Link to="/employer/jobs/new">
            <Plus className="size-4" />
            Post a New Job
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat tone="blue" icon={FileText} label="Total Jobs" value={roles.length} hint={periodDelta(roles.map((j) => j.postedAt))} />
        <Stat tone="violet" icon={Users} label="Total Applicants" value={list.length} hint={periodDelta(list.map((a) => a.submittedAt))} />
        <Stat tone="green" icon={CheckCircle2} label="Active Jobs" value={activeCount} />
        <Stat tone="amber" icon={Clock} label="Awaiting review" value={waiting.length} />
        <Stat tone="mint" icon={CheckCircle2} label="Hired" value={hiredApps.length} hint={periodDelta(hiredApps.map((a) => a.submittedAt))} />
      </div>

      {banner ? (
        <div className="relative overflow-hidden rounded-2xl border border-[#d7eadc] bg-gradient-to-r from-[#e8f6ee] via-[#eef8f1] to-white px-5 py-4 sm:px-6">
          <button
            type="button"
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
            onClick={closeBanner}
          >
            <X className="size-4" />
          </button>
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div>
              <h2 className="font-serif text-xl text-[var(--forest)]">Find the right talent, faster.</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Get packets from people who meant to apply — after they approve. Write a clear post and Atelier scores
                candidates against it.
              </p>
            </div>
            <img
              src={localBrandPath('employer-tablet.jpg', 'employer')}
              alt=""
              className="hidden h-20 w-36 rounded-xl object-cover sm:block"
            />
            <Link
              to="/employer/jobs/new"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#147a48] px-4 text-sm font-medium text-white hover:bg-[#0f5e37]"
            >
              Post a job
            </Link>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#e4ebe6] bg-white shadow-[0_12px_32px_rgba(19,38,31,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef3f0] px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['all', `All Jobs (${roles.length})`],
                ['active', `Active (${activeCount})`],
                ['hired', `Hired (${hiredJobCount})`],
                ['closed', `Closed (${closedCount})`],
                ['drafts', `Drafts (${hasDraft ? 1 : 0})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id)
                  setPage(0)
                }}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm',
                  tab === id ? 'bg-[#e8f3ec] font-medium text-[#147a48]' : 'text-muted-foreground hover:bg-[#f4f7f5]',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex items-center gap-2">
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
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="applicants">Applicants</option>
              </select>
            </label>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e4ebe6] px-3 text-sm text-[var(--forest)]"
              onClick={() => setFilterOpen((v) => !v)}
            >
              <Filter className="size-3.5" />
              Filter
            </button>
            {filterOpen ? (
              <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-[#e4ebe6] bg-white p-2 shadow-lg">
                {['all', 'full-time', 'part-time', 'contract', 'freelance'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      'block w-full rounded-lg px-3 py-1.5 text-left text-sm',
                      typeFilter === t ? 'bg-[#e8f3ec] text-[#147a48]' : 'hover:bg-[#f4f7f5]',
                    )}
                    onClick={() => {
                      setTypeFilter(t)
                      setFilterOpen(false)
                      setPage(0)
                    }}
                  >
                    {t === 'all' ? 'All types' : t.replace('-', ' ')}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {tab === 'drafts' ? (
          hasDraft ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eef3f0] text-[var(--forest)]">
                  <FileText className="size-4" />
                </span>
                <div>
                  <p className="font-medium text-[var(--forest)]">{draft?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Saved on this device · {draft?.category}
                    {draft?.subcategory ? ` · ${draft.subcategory}` : ''}
                  </p>
                </div>
              </div>
              <Button className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" asChild>
                <Link to="/employer/jobs/new">Continue editing</Link>
              </Button>
            </div>
          ) : (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">No drafts on this device.</p>
          )
        ) : shown.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#f7faf8] text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Job Title</th>
                    <th className="px-4 py-3 font-semibold">Applicants</th>
                    <th className="px-4 py-3 font-semibold">Pay</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Posted Date</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <JobRow
                      key={row.job.id}
                      {...row}
                      menuOpen={menuId === row.job.id}
                      onMenu={() => setMenuId((cur) => (cur === row.job.id ? null : row.job.id))}
                      onAsk={(action) => {
                        setActionError('')
                        setMenuId(null)
                        setConfirm({ id: row.job.id, title: row.job.title, action, applicants: row.apps.length })
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-3 lg:hidden">
              {shown.map((row) => (
                <JobCard
                  key={row.job.id}
                  {...row}
                  menuOpen={menuId === row.job.id}
                  onMenu={() => setMenuId((cur) => (cur === row.job.id ? null : row.job.id))}
                  onAsk={(action) => {
                    setActionError('')
                    setMenuId(null)
                    setConfirm({ id: row.job.id, title: row.job.title, action, applicants: row.apps.length })
                  }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-[#eef3f0] px-4 py-3 text-sm text-muted-foreground">
              <p>
                Showing {rows.length ? page * PAGE + 1 : 0}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg border border-[#e4ebe6] disabled:opacity-40"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <span className="grid size-8 place-items-center rounded-lg bg-[#147a48] text-white">{page + 1}</span>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg border border-[#e4ebe6] disabled:opacity-40"
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
          <div className="px-4 py-14 text-center">
            <p className="font-serif text-xl text-[var(--forest)]">{roles.length ? 'Nothing in this view' : 'No roles yet'}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {roles.length
                ? 'Try another tab or filter.'
                : 'Post a job so matched candidates can apply to you directly on Atelier.'}
            </p>
            {!roles.length ? (
              <Button className="mt-5 rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" asChild>
                <Link to="/employer/jobs/new">Post a job</Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {confirm ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#13261f]/45 p-4"
          onClick={() => !(patchJob.isPending || deleteJob.isPending) && setConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#e4ebe6] bg-white p-5 shadow-[0_20px_50px_rgba(19,38,31,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-2xl text-[var(--forest)]">
              {confirm.action === 'delete'
                ? 'Delete this job?'
                : confirm.action === 'close'
                  ? 'Close this listing?'
                  : 'Reopen this listing?'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {confirm.action === 'delete'
                ? confirm.applicants
                  ? `“${confirm.title}” has applicants, so it cannot be deleted. Close it instead — it leaves candidate search and keeps the inbox.`
                  : `“${confirm.title}” will be removed. This cannot be undone.`
                : confirm.action === 'close'
                  ? `“${confirm.title}” will leave candidate search. Applicants stay in your inbox.`
                  : `“${confirm.title}” will show in candidate search again.`}
            </p>
            {actionError ? <p className="mt-3 text-sm text-[#8f4326]">{actionError}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={patchJob.isPending || deleteJob.isPending}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </Button>
              {confirm.action === 'delete' && confirm.applicants ? (
                <Button
                  type="button"
                  className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]"
                  disabled={patchJob.isPending}
                  onClick={() => patchJob.mutate({ id: confirm.id, listingStatus: 'closed' })}
                >
                  {patchJob.isPending ? 'Closing…' : 'Mark as closed'}
                </Button>
              ) : (
                <Button
                  type="button"
                  className={cn(
                    'rounded-xl',
                    confirm.action === 'delete' ? 'bg-[#b85c38] hover:bg-[#9a4a2c]' : 'bg-[#147a48] hover:bg-[#0f5e37]',
                  )}
                  disabled={patchJob.isPending || deleteJob.isPending}
                  onClick={() => {
                    if (confirm.action === 'delete') deleteJob.mutate(confirm.id)
                    else patchJob.mutate({ id: confirm.id, listingStatus: confirm.action === 'close' ? 'closed' : 'active' })
                  }}
                >
                  {confirm.action === 'delete'
                    ? deleteJob.isPending
                      ? 'Deleting…'
                      : 'Delete'
                    : confirm.action === 'close'
                      ? patchJob.isPending
                        ? 'Closing…'
                        : 'Mark as closed'
                      : patchJob.isPending
                        ? 'Reopening…'
                        : 'Reopen'}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function JobRow({
  job,
  apps,
  hired,
  menuOpen,
  onMenu,
  onAsk,
}: {
  job: Job
  apps: InboxRow[]
  hired: boolean
  menuOpen: boolean
  onMenu: () => void
  onAsk: (action: ConfirmAction) => void
}) {
  const faces = apps.slice(0, 3)
  const category = job.skills[0] || job.employmentType?.replace('-', ' ') || 'Role'
  return (
    <tr className="border-t border-[#eef3f0]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <JobMark title={job.title} category={category} />
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--forest)]">{job.title}</p>
            <p className="text-xs text-muted-foreground">{category}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex -space-x-2">
            {faces.map((a) => (
              <span
                key={a.id}
                className="grid size-7 place-items-center rounded-full border-2 border-white bg-[#dce8e0] text-[0.6rem] font-semibold text-[var(--forest)]"
                title={a.candidateName || a.candidateEmail}
              >
                {initials(a.candidateName || a.candidateEmail || 'C')}
              </span>
            ))}
          </span>
          <span className="tabular-nums text-[var(--forest)]">{apps.length}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{moneyBand(job.salaryMin, job.salaryMax, job.currency)}</td>
      <td className="px-4 py-3">
        <StatusChip hired={hired} closed={isClosed(job)} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatPosted(job.postedAt)}</td>
      <td className="px-4 py-3">
        <JobActions job={job} apps={apps} hired={hired} menuOpen={menuOpen} onMenu={onMenu} onAsk={onAsk} />
      </td>
    </tr>
  )
}

function JobCard({
  job,
  apps,
  hired,
  menuOpen,
  onMenu,
  onAsk,
}: {
  job: Job
  apps: InboxRow[]
  hired: boolean
  menuOpen: boolean
  onMenu: () => void
  onAsk: (action: ConfirmAction) => void
}) {
  const category = job.skills[0] || job.employmentType?.replace('-', ' ') || 'Role'
  return (
    <article className="rounded-2xl border border-[#e4ebe6] p-4">
      <div className="flex items-start gap-3">
        <JobMark title={job.title} category={category} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--forest)]">{job.title}</p>
          <p className="text-xs text-muted-foreground">{category}</p>
        </div>
        <StatusChip hired={hired} closed={isClosed(job)} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {apps.length} {apps.length === 1 ? 'applicant' : 'applicants'} · {formatPosted(job.postedAt)}
      </p>
      <div className="mt-3">
        <JobActions job={job} apps={apps} hired={hired} menuOpen={menuOpen} onMenu={onMenu} onAsk={onAsk} />
      </div>
    </article>
  )
}

function JobActions({
  job,
  apps,
  hired,
  menuOpen,
  onMenu,
  onAsk,
}: {
  job: Job
  apps: InboxRow[]
  hired: boolean
  menuOpen: boolean
  onMenu: () => void
  onAsk: (action: ConfirmAction) => void
}) {
  const closed = isClosed(job)
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="rounded-lg" asChild>
        <Link to={`/employer/inbox?job=${encodeURIComponent(job.id)}`}>
          {hired ? 'View Hired' : 'View Applicants'}
        </Link>
      </Button>
      <div className="relative">
        {menuOpen ? (
          <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Close menu" onClick={onMenu} />
        ) : null}
        <button
          type="button"
          className="relative z-30 grid size-8 place-items-center rounded-lg border border-[#e4ebe6] text-[var(--forest)] hover:bg-[#f4f7f5]"
          aria-label="Job actions"
          aria-expanded={menuOpen}
          onClick={onMenu}
        >
          <MoreHorizontal className="size-4" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-[#e4ebe6] bg-white py-1 shadow-lg">
            <Link
              to={`/employer/jobs/${encodeURIComponent(job.id)}/edit`}
              className="block px-3 py-2 text-sm text-[var(--forest)] hover:bg-[#f4f7f5]"
            >
              Edit
            </Link>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-[var(--forest)] hover:bg-[#f4f7f5]"
              onClick={() => onAsk(closed ? 'reopen' : 'close')}
            >
              {closed ? 'Reopen listing' : 'Mark as closed'}
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-[#b85c38] hover:bg-[#fbf4f1]"
              onClick={() => onAsk('delete')}
            >
              Delete
            </button>
            {apps.length ? (
              <p className="border-t border-[#eef3f0] px-3 py-2 text-[0.65rem] leading-relaxed text-muted-foreground">
                Has applicants — delete asks you to close instead.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function JobMark({ title, category }: { title: string; category: string }) {
  const Icon = iconFor(title, category)
  const tone = toneFor(title, category)
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}>
      <Icon className="size-4" />
    </span>
  )
}

function StatusChip({ hired, closed }: { hired: boolean; closed: boolean }) {
  if (closed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <i className="size-2 rounded-full bg-[#9aa89f]" />
        Closed
      </span>
    )
  }
  return hired ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-[#147a48]">
      <i className="size-2 rounded-full bg-[#147a48]" />
      Hired
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm text-[#147a48]">
      <i className="size-2 rounded-full bg-[#22c55e]" />
      Active
    </span>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof FileText
  label: string
  value: number
  hint?: string
  tone: 'blue' | 'violet' | 'green' | 'amber' | 'mint'
}) {
  const tones = {
    blue: 'bg-[#eaf2ff] text-[#3b6fd8]',
    violet: 'bg-[#f1e8ff] text-[#7b5cb0]',
    green: 'bg-[#e8f3ec] text-[#147a48]',
    amber: 'bg-[#fff4e5] text-[#c47b12]',
    mint: 'bg-[#e7f6ee] text-[#147a48]',
  }
  return (
    <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)]">
      <span className={cn('grid size-10 place-items-center rounded-xl', tones[tone])}>
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-serif text-3xl tabular-nums text-[var(--forest)]">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint ? (
        <p className={cn('mt-1 text-xs', hint.startsWith('-') ? 'text-[#c45c4a]' : 'text-[#147a48]')}>{hint}</p>
      ) : null}
    </div>
  )
}

function iconFor(title: string, category: string) {
  const t = `${title} ${category}`.toLowerCase()
  if (/design|figma|ui|ux/.test(t)) return Palette
  if (/mobile|flutter|ios|android/.test(t)) return Smartphone
  if (/market|social|content|writer/.test(t)) return /writer|content|write/.test(t) ? PenLine : Megaphone
  if (/react|node|code|develop|engineer|software/.test(t)) return Code2
  return Briefcase
}

function toneFor(title: string, category: string) {
  const t = `${title} ${category}`.toLowerCase()
  if (/design|figma|ui|ux/.test(t)) return 'bg-[#e6f4f4] text-[#2a8a86]'
  if (/mobile|flutter/.test(t)) return 'bg-[#eaf3ff] text-[#3b6fd8]'
  if (/writer|content|write/.test(t)) return 'bg-[#fff6e0] text-[#c49a12]'
  if (/market|social/.test(t)) return 'bg-[#ffece6] text-[#d2653a]'
  if (/react|laravel|code|develop/.test(t)) return 'bg-[#ece7ff] text-[#6b4fb0]'
  return 'bg-[#e8f3ec] text-[#147a48]'
}

function isClosed(job: Job) {
  return job.listingStatus === 'closed'
}

function formatPosted(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as { title?: string; category?: string; subcategory?: string }
    if (!draft.title?.trim()) return null
    return draft
  } catch {
    return null
  }
}
