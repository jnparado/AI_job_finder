import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  CircleHelp,
  Clock,
  CreditCard,
  Crown,
  Download,
  Headphones,
  Tag,
  Wallet,
} from 'lucide-react'
import type { LedgerEntry } from '@shared/finances'
import { formatMoney, isEmployerPromo, isPaidPlan, priceCents, type Plan, type Subscription } from '@shared/billing'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, money } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type BillingTab = 'overview' | 'transactions' | 'invoices' | 'methods' | 'plans'

interface FinancesPayload {
  role: 'employer'
  sent: LedgerEntry[]
}

interface BillingPayload {
  subscription: Subscription
  plan: Plan
  providers: { stripe: boolean; paypal: boolean }
  role: 'employer'
}

interface PlansPayload {
  plans: Plan[]
  providers: { stripe: boolean; paypal: boolean }
}

const TABS: { id: BillingTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'methods', label: 'Payment Methods' },
  { id: 'plans', label: 'Plans & Pricing' },
]

const FUND_AMOUNTS = [50, 100, 200, 500]

function invoiceId(row: LedgerEntry) {
  return `INV-${row.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function statusLabel(status: LedgerEntry['status']) {
  if (status === 'available' || status === 'sent') return 'Paid'
  if (status === 'pending') return 'Pending'
  return 'Failed'
}

function statusTone(status: LedgerEntry['status']) {
  if (status === 'available' || status === 'sent') return 'bg-[#e8f3ec] text-[#147a48]'
  if (status === 'pending') return 'bg-[#fff4e5] text-[#9a6b1a]'
  return 'bg-[#fdecea] text-[#b42318]'
}

function typeLabel(kind: LedgerEntry['kind']) {
  return kind === 'from_employer' ? 'Candidate Pay' : 'Payout'
}

function typeTone(kind: LedgerEntry['kind']) {
  return kind === 'from_employer' ? 'bg-[#eaf2ff] text-[#3b6fd8]' : 'bg-[#f3ecff] text-[#7c3aed]'
}

function planPrice(plan: Plan, subscription: Subscription) {
  if (!isPaidPlan(plan.id)) return 'Free'
  if (isEmployerPromo(subscription)) return 'Free first year'
  const cents = priceCents(plan, subscription.interval)
  const suffix = subscription.interval === 'year' ? '/year' : '/month'
  return `${formatMoney(cents)}${suffix}`
}

export function BillingDesk() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'overview') as BillingTab
  const [fundAmount, setFundAmount] = useState(100)
  const [notice, setNotice] = useState('')

  const finances = useQuery({
    queryKey: ['finances'],
    queryFn: () => api<FinancesPayload>('/api/finances'),
  })
  const billing = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: () => api<BillingPayload>('/api/billing/subscription'),
  })
  const plans = useQuery({
    queryKey: ['billing-plans'],
    queryFn: () => api<PlansPayload>('/api/billing/plans'),
  })

  const sent = finances.data?.sent ?? []
  const currency = profile.currency || 'USD'
  const year = new Date().getFullYear()
  const yearSent = sent.filter((row) => new Date(row.createdAt).getFullYear() === year)
  const totalSpent = yearSent.reduce((sum, row) => sum + row.amount, 0)
  const allTimeSpent = sent.reduce((sum, row) => sum + row.amount, 0)
  const subscription = billing.data?.subscription
  const plan = billing.data?.plan
  const providers = billing.data?.providers ?? plans.data?.providers ?? { stripe: false, paypal: false }
  const employerPlans = plans.data?.plans ?? []
  const sortedSent = useMemo(
    () => [...sent].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sent],
  )

  const checkout = useMutation({
    mutationFn: (body: { planId: string; provider?: 'stripe' | 'paypal' }) =>
      api<{ url?: string; demo?: boolean; note?: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ ...body, interval: 'year' }),
      }),
    onSuccess: (res) => {
      if (res.url) {
        window.location.href = res.url
        return
      }
      setNotice(res.note ?? 'Checkout opened in demo mode.')
      void qc.invalidateQueries({ queryKey: ['billing-subscription'] })
    },
    onError: (err) => setNotice(err instanceof Error ? err.message : 'Checkout failed.'),
  })

  function setTab(next: BillingTab) {
    const cur = new URLSearchParams(params)
    if (next === 'overview') cur.delete('tab')
    else cur.set('tab', next)
    setParams(cur, { replace: true })
  }

  const balance = 0
  const hasCheckout = providers.stripe || providers.paypal

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-semibold leading-tight text-[var(--forest)] sm:text-[1.85rem]">
            Payments & Billing
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage your payments, invoices, and subscription. Hire top talent with secure and transparent billing.
          </p>
        </div>
        <Button variant="outline" className="h-10 rounded-lg border-[#e4ebe6] px-4" asChild>
          <Link to="/legal">
            <CircleHelp className="size-4" />
            Billing Help
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={Wallet}
          label="Available Balance"
          value={money(balance, currency)}
          hint="Use your balance to pay for job posts and contracts."
          action={
            <Button
              className="mt-3 h-9 rounded-lg bg-[#13261f] px-4 text-sm hover:bg-[#0d1b16]"
              disabled={!hasCheckout}
              onClick={() => plan && checkout.mutate({ planId: plan.id, provider: providers.stripe ? 'stripe' : 'paypal' })}
            >
              Add Funds
            </Button>
          }
        />
        <SummaryCard
          icon={BarChart3}
          label="Total Spent"
          value={money(totalSpent || allTimeSpent, currency)}
          hint={totalSpent ? 'Year to date' : sent.length ? 'All time' : 'No payments yet'}
        />
        <SummaryCard
          icon={Crown}
          label="Active Plan"
          value={plan?.name ?? 'Starter'}
          hint={plan && subscription ? planPrice(plan, subscription) : 'Loading plan…'}
          action={
            plan ? (
              <Button
                variant="outline"
                className="mt-3 h-9 rounded-lg border-[#e4ebe6] px-4 text-sm"
                onClick={() => setTab('plans')}
              >
                Manage Plan
              </Button>
            ) : null
          }
        />
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#e4ebe6] px-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors',
              tab === id
                ? 'border-[#147a48] font-medium text-[var(--forest)]'
                : 'border-transparent text-muted-foreground hover:text-[var(--forest)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {notice ? <p className="text-sm text-[#147a48]">{notice}</p> : null}

      {tab === 'overview' ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-5">
            <PaymentMethodsPanel providers={providers} onAdd={() => setTab('methods')} />
            <RecentTransactions
              rows={sortedSent.slice(0, 6)}
              loading={finances.isLoading}
              onViewAll={() => setTab('transactions')}
            />
          </div>
          <aside className="space-y-4">
            <AddFundsCard
              amount={fundAmount}
              onAmount={setFundAmount}
              disabled={!hasCheckout || checkout.isPending}
              onSubmit={() => plan && checkout.mutate({ planId: plan.id, provider: providers.stripe ? 'stripe' : 'paypal' })}
            />
            <AnnualPromo
              plan={plan}
              subscription={subscription}
              disabled={checkout.isPending}
              onUpgrade={() =>
                checkout.mutate({ planId: 'employer-hiring', provider: providers.stripe ? 'stripe' : 'paypal' })
              }
            />
            <HelpCard />
          </aside>
        </div>
      ) : null}

      {tab === 'transactions' ? (
        <Panel title="All Transactions" subtitle="Payments sent to candidates on Atelier.">
          <TransactionsTable rows={sortedSent} loading={finances.isLoading} empty="No payments yet. Send pay from a packet in your inbox." />
        </Panel>
      ) : null}

      {tab === 'invoices' ? (
        <Panel title="Invoices" subtitle="Receipt references for payments on your account.">
          <InvoicesTable rows={sortedSent} loading={finances.isLoading} />
        </Panel>
      ) : null}

      {tab === 'methods' ? (
        <Panel title="Payment Methods" subtitle="Cards and wallets are saved by your payment provider at checkout — not on Atelier.">
          <PaymentMethodsPanel providers={providers} onAdd={() => plan && checkout.mutate({ planId: plan.id, provider: providers.stripe ? 'stripe' : 'paypal' })} expanded />
        </Panel>
      ) : null}

      {tab === 'plans' ? (
        <PlansPanel
          plans={employerPlans}
          subscription={subscription}
          loading={plans.isLoading || billing.isLoading}
          checkoutPending={checkout.isPending}
          providers={providers}
          onSelect={(planId) => checkout.mutate({ planId, provider: providers.stripe ? 'stripe' : 'paypal' })}
        />
      ) : null}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  action,
}: {
  icon: typeof Wallet
  label: string
  value: string
  hint: string
  action?: ReactNode
}) {
  return (
    <article className="rounded-xl border border-[#e4ebe6] bg-white p-5 shadow-[0_4px_16px_rgba(19,38,31,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--forest)]">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          {action}
        </div>
        <span className="grid size-10 place-items-center rounded-full bg-[#e8f3ec] text-[#147a48]">
          <Icon className="size-5" />
        </span>
      </div>
    </article>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e4ebe6] bg-white p-5 shadow-[0_4px_16px_rgba(19,38,31,0.04)]">
      <h2 className="text-lg font-semibold text-[var(--forest)]">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function PaymentMethodsPanel({
  providers,
  onAdd,
  expanded,
}: {
  providers: { stripe: boolean; paypal: boolean }
  onAdd: () => void
  expanded?: boolean
}) {
  const configured = providers.stripe || providers.paypal
  return (
    <section className="rounded-xl border border-[#e4ebe6] bg-white p-5 shadow-[0_4px_16px_rgba(19,38,31,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#eef3f0] text-[var(--forest)]">
            <CreditCard className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold text-[var(--forest)]">Payment Methods</h2>
            <p className="text-sm text-muted-foreground">Manage your saved cards and payment options.</p>
          </div>
        </div>
        <button type="button" className="text-sm font-medium text-[#147a48] hover:underline" onClick={onAdd}>
          + Add Payment Method
        </button>
      </div>
      <div className={cn('mt-4 space-y-3', !expanded && 'max-h-[14rem] overflow-hidden')}>
        {!configured ? (
          <p className="rounded-lg border border-dashed border-[#d7ddd8] px-4 py-8 text-center text-sm text-muted-foreground">
            Card checkout is not configured on this server yet. Payments you send to candidates still post to your ledger.
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-[#d7ddd8] px-4 py-8 text-center text-sm text-muted-foreground">
            No saved cards on file yet. Add one at checkout — Atelier does not store card numbers.
          </p>
        )}
      </div>
    </section>
  )
}

function RecentTransactions({
  rows,
  loading,
  onViewAll,
}: {
  rows: LedgerEntry[]
  loading: boolean
  onViewAll: () => void
}) {
  return (
    <section className="rounded-xl border border-[#e4ebe6] bg-white p-5 shadow-[0_4px_16px_rgba(19,38,31,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#eef3f0] text-[var(--forest)]">
            <Clock className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold text-[var(--forest)]">Recent Transactions</h2>
            <p className="text-sm text-muted-foreground">Your latest payment activity.</p>
          </div>
        </div>
        <button type="button" className="text-sm font-medium text-[#147a48] hover:underline" onClick={onViewAll}>
          View All Transactions →
        </button>
      </div>
      <TransactionsTable rows={rows} loading={loading} compact empty="Send pay from your inbox to see activity here." />
    </section>
  )
}

function TransactionsTable({
  rows,
  loading,
  compact,
  empty,
}: {
  rows: LedgerEntry[]
  loading: boolean
  compact?: boolean
  empty: string
}) {
  if (loading) return <p className="mt-4 text-sm text-muted-foreground">Loading transactions…</p>
  if (!rows.length) {
    return <p className="mt-4 rounded-lg border border-dashed border-[#d7ddd8] px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <div className={cn('mt-4 overflow-x-auto', compact && '-mx-1')}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#eef3f0] text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-2 font-medium">Date</th>
            <th className="px-2 py-2 font-medium">Description</th>
            <th className="px-2 py-2 font-medium">Type</th>
            <th className="px-2 py-2 font-medium">Amount</th>
            <th className="px-2 py-2 font-medium">Status</th>
            {!compact ? <th className="px-2 py-2 font-medium">Invoice</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[#f4f7f5] last:border-0">
              <td className="px-2 py-3 text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
              <td className="px-2 py-3 text-[var(--forest)]">
                {row.jobTitle ? `Pay: ${row.jobTitle}` : row.note || 'Candidate payment'}
              </td>
              <td className="px-2 py-3">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', typeTone(row.kind))}>
                  {typeLabel(row.kind)}
                </span>
              </td>
              <td className="px-2 py-3 font-medium text-[var(--forest)]">−{money(row.amount, row.currency)}</td>
              <td className="px-2 py-3">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusTone(row.status))}>
                  {statusLabel(row.status)}
                </span>
              </td>
              {!compact ? (
                <td className="px-2 py-3">
                  <span className="inline-flex items-center gap-1 text-[#147a48]">
                    {invoiceId(row)}
                    <Download className="size-3.5 opacity-70" />
                  </span>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvoicesTable({ rows, loading }: { rows: LedgerEntry[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading invoices…</p>
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed border-[#d7ddd8] px-4 py-8 text-center text-sm text-muted-foreground">
        Invoices appear when you send pay to candidates.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#eef3f0] text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-2 font-medium">Invoice</th>
            <th className="px-2 py-2 font-medium">Date</th>
            <th className="px-2 py-2 font-medium">Description</th>
            <th className="px-2 py-2 font-medium">Amount</th>
            <th className="px-2 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[#f4f7f5] last:border-0">
              <td className="px-2 py-3 font-medium text-[#147a48]">{invoiceId(row)}</td>
              <td className="px-2 py-3 text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
              <td className="px-2 py-3 text-[var(--forest)]">{row.note || row.jobTitle || 'Candidate payment'}</td>
              <td className="px-2 py-3 font-medium text-[var(--forest)]">{money(row.amount, row.currency)}</td>
              <td className="px-2 py-3">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusTone(row.status))}>
                  {statusLabel(row.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AddFundsCard({
  amount,
  onAmount,
  onSubmit,
  disabled,
}: {
  amount: number
  onAmount: (value: number) => void
  onSubmit: () => void
  disabled: boolean
}) {
  return (
    <section className="rounded-xl border border-[#e4ebe6] bg-white p-4 shadow-[0_4px_16px_rgba(19,38,31,0.04)]">
      <h3 className="font-semibold text-[var(--forest)]">Add Funds</h3>
      <p className="mt-1 text-xs text-muted-foreground">Top up through secure checkout when billing is connected.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {FUND_AMOUNTS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onAmount(value)}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              amount === value
                ? 'border-[#13261f] bg-[#13261f] text-white'
                : 'border-[#e4ebe6] text-[var(--forest)] hover:border-[#147a48]',
            )}
          >
            ${value}
          </button>
        ))}
      </div>
      <Button
        className="mt-3 h-10 w-full rounded-lg bg-[#13261f] hover:bg-[#0d1b16]"
        disabled={disabled}
        onClick={onSubmit}
      >
        Add ${amount} to Balance
      </Button>
    </section>
  )
}

function AnnualPromo({
  plan,
  subscription,
  onUpgrade,
  disabled,
}: {
  plan?: Plan
  subscription?: Subscription
  onUpgrade: () => void
  disabled: boolean
}) {
  const onPromo = subscription && isEmployerPromo(subscription)
  const end = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <section className="rounded-xl border border-[#cfe8d9] bg-[#f3faf6] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-white text-[#147a48]">
          <Tag className="size-4" />
        </span>
        <div>
          <h3 className="font-semibold text-[var(--forest)]">Save More with Annual Billing</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {onPromo && end
              ? `Your ${plan?.name ?? 'Hiring'} plan is free through ${end}. After that, billing is yearly.`
              : 'Employer plans bill yearly. Upgrade when your promo ends.'}
          </p>
          {!onPromo && plan?.id !== 'employer-hiring' ? (
            <Button
              variant="outline"
              className="mt-3 h-9 rounded-lg border-[#147a48] bg-white px-4 text-sm text-[#147a48]"
              disabled={disabled}
              onClick={onUpgrade}
            >
              Upgrade to Annual
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function HelpCard() {
  return (
    <section className="rounded-xl border border-[#e4ebe6] bg-white p-4 shadow-[0_4px_16px_rgba(19,38,31,0.04)]">
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-[#eef3f0] text-[var(--forest)]">
          <Headphones className="size-4" />
        </span>
        <div>
          <h3 className="font-semibold text-[var(--forest)]">Need Help?</h3>
          <p className="mt-1 text-xs text-muted-foreground">Questions about billing, invoices, or your plan.</p>
          <Button variant="outline" className="mt-3 h-9 rounded-lg px-4 text-sm" asChild>
            <Link to="/legal">Contact Support</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function PlansPanel({
  plans,
  subscription,
  loading,
  checkoutPending,
  providers,
  onSelect,
}: {
  plans: Plan[]
  subscription?: Subscription
  loading: boolean
  checkoutPending: boolean
  providers: { stripe: boolean; paypal: boolean }
  onSelect: (planId: string) => void
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading plans…</p>
  if (!plans.length) {
    return <p className="text-sm text-muted-foreground">No employer plans available.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {plans.map((item) => {
        const active = subscription?.planId === item.id
        const yearly = priceCents(item, 'year')
        return (
          <article
            key={item.id}
            className={cn(
              'rounded-xl border bg-white p-5 shadow-[0_4px_16px_rgba(19,38,31,0.04)]',
              active ? 'border-[#147a48] ring-1 ring-[#147a48]/20' : 'border-[#e4ebe6]',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--forest)]">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.tagline}</p>
              </div>
              {active ? (
                <span className="rounded-full bg-[#e8f3ec] px-2.5 py-0.5 text-xs font-medium text-[#147a48]">Current</span>
              ) : null}
            </div>
            <p className="mt-4 text-2xl font-semibold text-[var(--forest)]">
              {yearly > 0 ? `${formatMoney(yearly)}/year` : 'Free'}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {item.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-[#147a48]">•</span>
                  {feature}
                </li>
              ))}
            </ul>
            {!active ? (
              <Button
                className="mt-5 h-10 w-full rounded-lg bg-[#13261f] hover:bg-[#0d1b16]"
                disabled={checkoutPending || (!providers.stripe && !providers.paypal && isPaidPlan(item.id))}
                onClick={() => onSelect(item.id)}
              >
                {isPaidPlan(item.id) ? 'Choose plan' : 'Switch to Starter'}
              </Button>
            ) : subscription?.currentPeriodEnd ? (
              <p className="mt-5 text-xs text-muted-foreground">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
