import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
  MapPin,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Timer,
  X,
} from 'lucide-react'
import type { Job } from '@shared/types'
import type { LedgerEntry } from '@shared/finances'
import { formatHoursMinutes, sessionSeconds, type TrackerSession } from '@shared/tracker'
import { api } from '@/lib/api'
import { cn, initials, money, prettyStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PayCandidate } from '@/pages/Finances'

interface InboxRow {
  id: string
  status: string
  createdAt?: string
  submittedAt?: string
  candidateName?: string
  candidateEmail?: string
  candidateHeadline?: string
  events?: { at: string; label: string; detail: string }[]
  job?: Job
}

type Phase = 'all' | 'active' | 'pending' | 'completed' | 'cancelled'
type DetailTab = 'overview' | 'hours' | 'pay' | 'activity'

export function EmployerContractsPage() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id')
  const [phase, setPhase] = useState<Phase>('all')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [moreFilters, setMoreFilters] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('overview')

  const inbox = useQuery({
    queryKey: ['employer-inbox'],
    queryFn: () => api<InboxRow[]>('/api/employer/applications'),
  })
  const finances = useQuery({
    queryKey: ['finances'],
    queryFn: () => api<{ sent?: LedgerEntry[] }>('/api/finances'),
  })
  const tracker = useQuery({
    queryKey: ['ateliar'],
    queryFn: () => api<{ sessions?: TrackerSession[] }>('/api/ateliar'),
  })

  const pay = finances.data?.sent ?? []
  const sessions = tracker.data?.sessions ?? []
  const all = inbox.data ?? []
  const contracts = all.filter((row) => isContractStatus(row.status))
  const hireable = all.filter((row) => !isContractStatus(row.status) && row.status !== 'rejected')

  const jobs = [...new Set(contracts.map((row) => row.job?.title).filter(Boolean))] as string[]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contracts.filter((row) => {
      const bucket = phaseOf(row.status)
      if (phase !== 'all' && bucket !== phase) return false
      if (statusFilter !== 'all' && bucket !== statusFilter) return false
      if (jobFilter !== 'all' && row.job?.title !== jobFilter) return false
      if (typeFilter !== 'all' && (row.job?.employmentType || 'full-time') !== typeFilter) return false
      if (!q) return true
      const hay = [contractCode(row), row.candidateName, row.candidateEmail, row.job?.title, row.job?.employmentType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [contracts, jobFilter, phase, query, statusFilter, typeFilter])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const slice = filtered.slice(page * pageSize, page * pageSize + pageSize)
  const selected = contracts.find((row) => row.id === selectedId) ?? null

  const counts = {
    all: contracts.length,
    active: contracts.filter((r) => phaseOf(r.status) === 'active').length,
    pending: contracts.filter((r) => phaseOf(r.status) === 'pending').length,
    completed: contracts.filter((r) => phaseOf(r.status) === 'completed').length,
    cancelled: contracts.filter((r) => phaseOf(r.status) === 'cancelled').length,
  }
  const deltas = {
    all: periodDelta(contracts.map((r) => r.submittedAt || r.createdAt)),
    active: periodDelta(contracts.filter((r) => phaseOf(r.status) === 'active').map((r) => r.submittedAt || r.createdAt)),
    pending: periodDelta(contracts.filter((r) => phaseOf(r.status) === 'pending').map((r) => r.submittedAt || r.createdAt)),
    completed: periodDelta(contracts.filter((r) => phaseOf(r.status) === 'completed').map((r) => r.submittedAt || r.createdAt)),
  }

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/employer/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employer-inbox'] })
      await qc.invalidateQueries({ queryKey: ['ateliar'] })
      setCreateOpen(false)
    },
  })

  function openRow(id: string) {
    const next = new URLSearchParams(params)
    next.set('id', id)
    setParams(next, { replace: true })
    setTab('overview')
    setMenuId(null)
  }

  function closeRow() {
    const next = new URLSearchParams(params)
    next.delete('id')
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        <Link to="/employer" className="hover:text-foreground">
          Employer
        </Link>
        <span className="px-1.5">›</span>
        <span className="text-foreground">Contracts</span>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl leading-tight text-[var(--forest)]">Contracts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage hired roles, track hours, and send pay. This is not a signed legal file unless you add one off-platform.
          </p>
        </div>
        <Button className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create Contract
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={FileText} tone="blue" label="Total Contracts" value={counts.all} hint={deltas.all} />
        <Metric icon={PenLine} tone="green" label="Active Contracts" value={counts.active} hint={deltas.active} />
        <Metric icon={Clock3} tone="gold" label="Pending offers" value={counts.pending} hint={deltas.pending} />
        <Metric icon={CheckCircle2} tone="teal" label="Completed" value={counts.completed} hint={deltas.completed} />
      </div>

      <div className={cn('grid items-start gap-4', selected ? 'xl:grid-cols-[minmax(0,1fr)_22.5rem]' : '')}>
        <div className="overflow-hidden rounded-2xl border border-[#e4ebe6] bg-white shadow-[0_12px_32px_rgba(19,38,31,0.04)]">
          <div className="flex flex-wrap gap-1 border-b border-[#eef3f0] px-2 pt-2">
            {(
              [
                ['all', `All Contracts (${counts.all})`],
                ['active', `Active (${counts.active})`],
                ['pending', `Pending (${counts.pending})`],
                ['completed', `Completed (${counts.completed})`],
                ['cancelled', `Cancelled (${counts.cancelled})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  'border-b-2 px-3 py-2.5 text-sm',
                  phase === id
                    ? 'border-[#147a48] font-medium text-[#147a48]'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
                onClick={() => {
                  setPhase(id)
                  setPage(0)
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[#eef3f0] px-4 py-3">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 rounded-xl bg-[#f4f7f5] pl-10"
                placeholder="Search by contract, candidate, or job title…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
              />
            </label>
            <select
              className="h-10 rounded-xl border border-[#e4ebe6] bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              className="h-10 rounded-xl border border-[#e4ebe6] bg-white px-3 text-sm"
              value={jobFilter}
              onChange={(e) => {
                setJobFilter(e.target.value)
                setPage(0)
              }}
            >
              <option value="all">All Jobs</option>
              {jobs.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e4ebe6] px-3 text-sm text-[var(--forest)]"
              onClick={() => setMoreFilters((v) => !v)}
            >
              <Filter className="size-3.5" />
              More Filters
            </button>
          </div>
          {moreFilters ? (
            <div className="border-b border-[#eef3f0] px-4 py-3">
              <label className="text-sm text-muted-foreground">
                Job type
                <select
                  className="mt-1 h-10 w-full max-w-xs rounded-xl border border-[#e4ebe6] bg-white px-3 text-sm text-[var(--forest)]"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setPage(0)
                  }}
                >
                  <option value="all">All types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                </select>
              </label>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="bg-[#f7faf8] text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Contract</th>
                  <th className="px-3 py-3 font-semibold">Candidate</th>
                  <th className="px-3 py-3 font-semibold">Job Title</th>
                  <th className="px-3 py-3 font-semibold">Start Date</th>
                  <th className="px-3 py-3 font-semibold">End Date</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => {
                  const paid = paidFor(pay, row.id)
                  const bucket = phaseOf(row.status)
                  return (
                    <tr
                      key={row.id}
                      className={cn('border-t border-[#eef3f0] hover:bg-[#f7faf8]', selectedId === row.id && 'bg-[#eef6f0]')}
                    >
                      <td className="px-4 py-3">
                        <button type="button" className="text-left" onClick={() => openRow(row.id)}>
                          <p className="font-medium text-[var(--forest)]">{contractCode(row)}</p>
                          <p className="text-xs text-muted-foreground">{typeLabel(row.job?.employmentType)}</p>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8f3ec] font-serif text-xs text-[var(--forest)]">
                            {initials(row.candidateName || row.candidateEmail || 'C')}
                          </span>
                          <span className="truncate">{row.candidateName || row.candidateEmail}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">{row.job?.title || '—'}</td>
                      <td className="px-3 py-3 text-muted-foreground">{fmtDate(row.submittedAt || row.createdAt)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{endLabel(row)}</td>
                      <td className="px-3 py-3">
                        <StatusPill phase={bucket} />
                      </td>
                      <td className="px-3 py-3 tabular-nums">{paid > 0 ? money(paid, row.job?.currency) : '—'}</td>
                      <td className="relative px-3 py-3">
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-full hover:bg-[#eef3f0]"
                          aria-label="Actions"
                          onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                        {menuId === row.id ? (
                          <div className="absolute right-3 z-20 w-44 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg">
                            <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => openRow(row.id)}>
                              View
                            </button>
                            <Link to={`/employer/messages/${row.id}`} className="block px-3 py-2 text-sm hover:bg-muted" onClick={() => setMenuId(null)}>
                              Message
                            </Link>
                            <Link to="/employer/ateliar" className="block px-3 py-2 text-sm hover:bg-muted" onClick={() => setMenuId(null)}>
                              Time tracker
                            </Link>
                            {bucket === 'active' ? (
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => update.mutate({ id: row.id, status: 'completed' })}
                              >
                                Mark completed
                              </button>
                            ) : null}
                            {bucket !== 'cancelled' ? (
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm text-[#8f4326] hover:bg-muted"
                                onClick={() => update.mutate({ id: row.id, status: 'rejected' })}
                              >
                                Cancel contract
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!slice.length ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              No contracts yet. Mark a candidate hired from Applicants to open one.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef3f0] px-4 py-3 text-sm text-muted-foreground">
            <p>
              Showing {filtered.length ? page * pageSize + 1 : 0}–{Math.min(filtered.length, page * pageSize + pageSize)} of{' '}
              {filtered.length} contracts
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2">
                Show
                <select
                  className="h-8 rounded-lg border border-[#e4ebe6] bg-white px-2 text-sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(0)
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                per page
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg border border-[#e4ebe6] disabled:opacity-40"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ‹
                </button>
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      'grid size-8 place-items-center rounded-lg text-sm',
                      i === page ? 'bg-[#147a48] text-white' : 'hover:bg-[#eef3f0]',
                    )}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg border border-[#e4ebe6] disabled:opacity-40"
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {selected ? (
          <aside className="overflow-hidden rounded-2xl border border-[#e4ebe6] bg-white shadow-[0_12px_32px_rgba(19,38,31,0.06)] xl:sticky xl:top-24">
            <div className="flex items-start justify-between gap-3 border-b border-[#eef3f0] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[var(--forest)]">Contract Details</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[var(--forest)]">{contractCode(selected)}</p>
                  <StatusPill phase={phaseOf(selected.status)} />
                </div>
              </div>
              <button type="button" aria-label="Close" className="grid size-8 place-items-center rounded-full hover:bg-[#eef3f0]" onClick={closeRow}>
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <h2 className="font-serif text-2xl leading-tight text-[var(--forest)]">{selected.job?.title || 'Role'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.job?.company}</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-[#e8f3ec] font-serif text-[var(--forest)]">
                  {initials(selected.candidateName || selected.candidateEmail || 'C')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{selected.candidateName || selected.candidateEmail}</p>
                  <p className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {selected.job?.location || selected.candidateHeadline || 'Location not set'}
                  </p>
                </div>
                <Link to={`/employer/inbox/${selected.id}`} className="shrink-0 text-sm font-medium text-[#147a48]">
                  View packet
                </Link>
              </div>
            </div>
            <div className="flex gap-1 border-b border-[#eef3f0] px-3">
              {(
                [
                  ['overview', 'Overview'],
                  ['hours', 'Hours'],
                  ['pay', 'Pay'],
                  ['activity', 'Activity'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    'border-b-2 px-3 py-2 text-sm',
                    tab === id ? 'border-[#147a48] text-[#147a48]' : 'border-transparent text-muted-foreground',
                  )}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="max-h-[28rem] space-y-4 overflow-y-auto p-5">
              {tab === 'overview' ? (
                <Overview row={selected} paid={paidFor(pay, selected.id)} hours={hoursFor(sessions, selected.id)} />
              ) : null}
              {tab === 'hours' ? <HoursList sessions={sessions.filter((s) => s.applicationId === selected.id)} /> : null}
              {tab === 'pay' ? <PayCandidate applicationId={selected.id} job={selected.job} /> : null}
              {tab === 'activity' ? (
                selected.events?.length ? (
                  <ul className="space-y-3 text-sm">
                    {selected.events.map((event) => (
                      <li key={`${event.at}-${event.label}`}>
                        <p className="font-medium">{event.label}</p>
                        <p className="text-muted-foreground">{event.detail}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(event.at)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                )
              ) : null}
            </div>
            <div className="space-y-2 border-t border-[#eef3f0] p-4">
              <Button className="w-full rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" asChild>
                <Link to={`/employer/messages/${selected.id}`}>Message candidate</Link>
              </Button>
              {phaseOf(selected.status) === 'active' ? (
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: selected.id, status: 'completed' })}
                >
                  Mark completed
                </Button>
              ) : (
                <Button variant="outline" className="w-full rounded-xl" asChild>
                  <Link to="/employer/ateliar">
                    <Timer className="size-4" />
                    Time tracker
                  </Link>
                </Button>
              )}
              {phaseOf(selected.status) !== 'cancelled' ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e8c4b6] py-2.5 text-sm text-[#8f4326] hover:bg-[#fdf4f0]"
                  onClick={() => update.mutate({ id: selected.id, status: 'rejected' })}
                >
                  Cancel contract
                </button>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[var(--forest)]">Create contract</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A contract opens when you mark someone hired. Pick a candidate from your inbox.
                </p>
              </div>
              <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-[#eef3f0]" onClick={() => setCreateOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            {hireable.length ? (
              <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {hireable.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#eef3f0] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.candidateName || row.candidateEmail}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.job?.title} · {prettyStatus(row.status)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full bg-[#147a48] hover:bg-[#0f5e37]"
                      disabled={update.isPending}
                      onClick={() => {
                        update.mutate({ id: row.id, status: 'hired' })
                        openRow(row.id)
                      }}
                    >
                      Mark hired
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No open packets to hire. When a candidate approves a packet, they appear here.
              </p>
            )}
            <Button variant="outline" className="mt-4 w-full rounded-full" asChild>
              <Link to="/employer/inbox">Open applicants</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Overview({ row, paid, hours }: { row: InboxRow; paid: number; hours: number }) {
  return (
    <dl className="space-y-3 text-sm">
      <Row label="Contract type" value={typeLabel(row.job?.employmentType)} />
      <Row label="Start date" value={fmtDate(row.submittedAt || row.createdAt)} />
      <Row label="End date" value={endLabel(row)} />
      <Row label="Pay sent" value={paid > 0 ? money(paid, row.job?.currency) : 'None yet'} />
      <Row label="Hours logged" value={hours ? formatHoursMinutes(hours) : 'None yet'} />
      {row.job?.description ? (
        <div>
          <dt className="text-muted-foreground">Description</dt>
          <dd className="mt-1 line-clamp-6 leading-relaxed">{row.job.description}</dd>
        </div>
      ) : null}
    </dl>
  )
}

function HoursList({ sessions }: { sessions: TrackerSession[] }) {
  if (!sessions.length) {
    return <p className="text-sm text-muted-foreground">No hours yet. The candidate clocks in from Atelier time tracker.</p>
  }
  return (
    <ul className="space-y-3">
      {sessions.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7faf8] px-3 py-2 text-sm">
          <div>
            <p className="font-medium">{new Date(row.startedAt).toLocaleDateString()}</p>
            <p className="text-xs text-muted-foreground">{row.endedAt ? 'Closed shift' : 'Live'}</p>
          </div>
          <p className="tabular-nums">{formatHoursMinutes(sessionSeconds(row))}</p>
        </li>
      ))}
      <Button variant="outline" size="sm" className="rounded-full" asChild>
        <Link to="/employer/ateliar">
          <Download className="size-4" />
          Open timesheet
        </Link>
      </Button>
    </ul>
  )
}

function Metric({
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
  tone: 'blue' | 'green' | 'gold' | 'teal'
}) {
  const tones = {
    blue: 'bg-[#e8f0fb] text-[#2563eb]',
    green: 'bg-[#e8f3ec] text-[#147a48]',
    gold: 'bg-[#f7f1e4] text-[#b08a3c]',
    teal: 'bg-[#e7f6f1] text-[#0f766e]',
  }
  return (
    <div className="rounded-[1.4rem] border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_28px_rgba(19,38,31,0.04)]">
      <span className={cn('grid size-10 place-items-center rounded-2xl', tones[tone])}>
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-serif text-3xl tabular-nums text-[var(--forest)]">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {hint ? (
        <p className={cn('mt-1 text-xs', hint.startsWith('-') ? 'text-[#c45c4a]' : 'text-[#147a48]')}>{hint}</p>
      ) : null}
    </div>
  )
}

function StatusPill({ phase }: { phase: Phase }) {
  const map: Record<Exclude<Phase, 'all'>, string> = {
    active: 'bg-[#e8f3ec] text-[#147a48]',
    pending: 'bg-[#f7f1e4] text-[#9a7a32]',
    completed: 'bg-[#e7f6f1] text-[#0f766e]',
    cancelled: 'bg-[#fde8e8] text-[#b42318]',
  }
  const label: Record<Exclude<Phase, 'all'>, string> = {
    active: 'Active',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  if (phase === 'all') return null
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', map[phase])}>● {label[phase]}</span>
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-[var(--forest)]">{value}</dd>
    </div>
  )
}

function isContractStatus(status: string) {
  return status === 'offer' || status === 'hired' || status === 'completed' || status === 'rejected'
}

function phaseOf(status: string): Exclude<Phase, 'all'> {
  if (status === 'offer') return 'pending'
  if (status === 'hired') return 'active'
  if (status === 'completed') return 'completed'
  return 'cancelled'
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

function typeLabel(value?: string) {
  if (!value) return 'Atelier role'
  return value.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function contractCode(row: InboxRow) {
  const year = new Date(row.submittedAt || row.createdAt || Date.now()).getFullYear()
  const n = Number.parseInt(row.id.replaceAll('-', '').slice(0, 6), 16)
  const serial = Number.isFinite(n) ? (n % 900) + 100 : 101
  return `CON-${year}-${serial}`
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function endLabel(row: InboxRow) {
  const phase = phaseOf(row.status)
  if (phase === 'active' || phase === 'pending') return 'Ongoing'
  const last = row.events?.[row.events.length - 1]?.at
  return fmtDate(last) === '—' ? fmtDate(row.submittedAt || row.createdAt) : fmtDate(last)
}

function paidFor(rows: LedgerEntry[], applicationId: string) {
  return rows.filter((row) => row.applicationId === applicationId).reduce((n, row) => n + row.amount, 0)
}

function hoursFor(sessions: TrackerSession[], applicationId: string) {
  return sessions.filter((row) => row.applicationId === applicationId).reduce((n, row) => n + sessionSeconds(row), 0)
}
