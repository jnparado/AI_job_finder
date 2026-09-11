import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Building2, Wallet } from 'lucide-react'
import type { FinanceOverview, LedgerEntry } from '@shared/finances'
import { emptyFinance } from '@shared/finances'
import type { Job } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { money } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/feedback'
import { HiringHero } from '@/components/employer/HiringChrome'

type Desk = 'overview' | 'ledger' | 'withdraw' | 'year'

interface CandidatePayload {
  role: 'candidate'
  overview: FinanceOverview
}

interface EmployerPayload {
  role: 'employer'
  sent: LedgerEntry[]
  overview: FinanceOverview
}

export function FinancesPage() {
  const { profile } = useAuth()
  const employer = profile.role === 'employer'
  const q = useQuery({
    queryKey: ['finances'],
    queryFn: () => api<CandidatePayload | EmployerPayload>('/api/finances'),
  })
  if (employer) return <EmployerFinances rows={q.data && 'sent' in q.data ? q.data.sent : []} loading={q.isLoading} />
  return <CandidateFinances overview={q.data && 'overview' in q.data ? q.data.overview : emptyFinance(profile.currency)} />
}

function CandidateFinances({ overview }: { overview: FinanceOverview }) {
  const qc = useQueryClient()
  const [desk, setDesk] = useState<Desk>('overview')
  const [amount, setAmount] = useState(String(overview.available || ''))
  const [notice, setNotice] = useState('')
  useEffect(() => {
    setAmount(String(overview.available || ''))
  }, [overview.available])
  const withdraw = useMutation({
    mutationFn: () =>
      api<{ overview: FinanceOverview }>('/api/finances/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['finances'] })
      setNotice('Payout is on your ledger. Bank rails are not connected yet — this records the request.')
    },
    onError: (err) => setNotice(err instanceof Error ? err.message : 'Withdraw failed.'),
  })
  const incoming = overview.entries.filter((e) => e.kind === 'from_employer')
  const year = new Date().getFullYear()
  const yearRows = overview.entries.filter((e) => new Date(e.createdAt).getFullYear() === year)
  const yearIn = yearRows.filter((e) => e.kind === 'from_employer').reduce((n, e) => n + e.amount, 0)
  const yearOut = yearRows.filter((e) => e.kind === 'withdraw').reduce((n, e) => n + e.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Finances"
        title="Pay from employers"
        description="Atelier employers send pay here after you work a role they posted. You withdraw from this desk. We never move money on LinkedIn, Upwork, or other boards."
      />

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-card p-1 sm:rounded-full">
        {(
          [
            ['overview', 'Overview'],
            ['ledger', 'Ledger'],
            ['withdraw', 'Withdraw'],
            ['year', 'Year record'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setDesk(id)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              desk === id ? 'bg-[var(--forest)] text-[var(--paper)]' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {desk === 'overview' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Available" value={money(overview.available, overview.currency)} />
            <Stat label="Waiting" value={money(overview.pending, overview.currency)} />
            <Stat label="Received" value={money(overview.received, overview.currency)} />
          </div>
          <Card className="space-y-3">
            <h2>From Atelier employers</h2>
            {incoming.length ? (
              incoming.slice(0, 6).map((row) => <LedgerLine key={row.id} row={row} />)
            ) : (
              <p className="text-sm text-muted-foreground">
                When an Atelier employer pays you for a packet they hired, it lands here.
              </p>
            )}
          </Card>
        </>
      ) : null}

      {desk === 'ledger' ? (
        <Card className="space-y-3">
          <h2>Ledger</h2>
          {overview.entries.length ? (
            overview.entries.map((row) => <LedgerLine key={row.id} row={row} />)
          ) : (
            <p className="text-sm text-muted-foreground">No pay has moved yet.</p>
          )}
        </Card>
      ) : null}

      {desk === 'withdraw' ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="size-4 text-[var(--copper)]" />
            <h2>Withdraw</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Available {money(overview.available, overview.currency)}. Bank payout is recorded on Atelier. We do not
            collect card numbers here.
          </p>
          <label className="block max-w-xs space-y-1 text-sm">
            Amount
            <Input type="number" min={20} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <Button
            variant="copper"
            disabled={withdraw.isPending || overview.available < 20}
            onClick={() => withdraw.mutate()}
          >
            {withdraw.isPending ? 'Sending…' : 'Request payout'}
          </Button>
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        </Card>
      ) : null}

      {desk === 'year' ? (
        <Card className="space-y-3">
          <h2>{year} record</h2>
          <p className="text-sm text-muted-foreground">
            Received {money(yearIn, overview.currency)} · withdrawn {money(yearOut, overview.currency)}. Use this for
            your own tax filing. Atelier is not a tax advisor.
          </p>
          {yearRows.length ? yearRows.map((row) => <LedgerLine key={row.id} row={row} />) : (
            <p className="text-sm text-muted-foreground">Nothing posted this year.</p>
          )}
        </Card>
      ) : null}
    </div>
  )
}

function EmployerFinances({ rows, loading }: { rows: LedgerEntry[]; loading: boolean }) {
  const sent = rows.filter((e) => e.kind === 'from_employer')
  const total = sent.reduce((n, e) => n + e.amount, 0)
  return (
    <div className="space-y-6">
      <HiringHero
        kicker="Finances"
        title="Pay candidates"
        description="Send pay to people who applied on Atelier. They withdraw it from their own desk."
        image="employer-office.jpg"
        imageAlt="Studio office"
        compact
        actions={
          <Button variant="paper" asChild>
            <Link to="/employer/inbox">Open inbox</Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Sent" value={money(total)} />
        <Stat label="Payments" value={String(sent.length)} />
      </div>
      <Card className="space-y-3">
        <h2>Sent from your desk</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sent.length ? (
          sent.map((row) => <LedgerLine key={row.id} row={row} />)
        ) : (
          <p className="text-sm text-muted-foreground">
            Open a packet in your inbox and send pay. Only Atelier roles can pay through this desk.
          </p>
        )}
      </Card>
    </div>
  )
}

function LedgerLine({ row }: { row: LedgerEntry }) {
  const inbound = row.kind === 'from_employer'
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium">
          {inbound ? <Building2 className="size-4 shrink-0 text-[var(--copper)]" /> : <Wallet className="size-4 shrink-0" />}
          {inbound ? row.company || 'Atelier employer' : 'Payout'}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {row.jobTitle ? `${row.jobTitle} · ` : ''}
          {row.note || (inbound ? 'Pay received' : 'Withdraw')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</p>
      </div>
      <div className="text-right">
        <p className={`font-serif text-xl ${inbound ? 'text-[var(--forest)]' : 'text-muted-foreground'}`}>
          {inbound ? '+' : '−'}
          {money(row.amount, row.currency)}
        </p>
        <Badge>{row.status}</Badge>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </Card>
  )
}

export function PayCandidate({ applicationId, job }: { applicationId: string; job?: Job }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('2400')
  const [note, setNote] = useState(job?.title ? `Pay for ${job.title}` : '')
  const [notice, setNotice] = useState('')
  const pay = useMutation({
    mutationFn: () =>
      api(`/api/employer/applications/${applicationId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), note }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['finances'] })
      setNotice('Sent to the candidate desk.')
    },
    onError: (err) => setNotice(err instanceof Error ? err.message : 'Could not send pay.'),
  })
  return (
    <Card className="space-y-3">
      <h2>Send pay</h2>
      <p className="text-sm text-muted-foreground">
        This lands on the candidate Finances desk. They withdraw it. Outside boards are not involved.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          Amount
          <Input type="number" min={20} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          Note
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <Button variant="copper" disabled={pay.isPending} onClick={() => pay.mutate()}>
        {pay.isPending ? 'Sending…' : 'Send to candidate'}
      </Button>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </Card>
  )
}
