import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CreditCard } from 'lucide-react'
import type { BillingInterval, Plan, Subscription } from '@shared/billing'
import { formatMoney, isPaidPlan } from '@shared/billing'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, Badge } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/feedback'

interface BillingPayload {
  subscription: Subscription
  plan?: Plan
  providers: { stripe: boolean; paypal: boolean }
  role: 'candidate' | 'employer'
}

export function BillingPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [interval, setInterval] = useState<BillingInterval>('month')
  const [notice, setNotice] = useState('')
  const role = profile.role === 'employer' ? 'employer' : 'candidate'

  const billing = useQuery({
    queryKey: ['billing'],
    queryFn: () => api<BillingPayload>('/api/billing/subscription'),
  })
  const catalog = useQuery({
    queryKey: ['billing-plans'],
    queryFn: () =>
      api<{ plans: Plan[]; providers: { stripe: boolean; paypal: boolean } }>('/api/billing/plans'),
  })

  const confirm = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<BillingPayload>('/api/billing/confirm', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['billing'] }),
  })

  useEffect(() => {
    const status = params.get('status')
    if (!status) return
    const sessionId = params.get('session_id')
    const subscriptionId = params.get('subscription_id')
    const demo = params.get('demo') === '1'
    if (status === 'success') {
      void confirm.mutateAsync({
        sessionId,
        subscriptionId,
        demo,
        provider: params.get('provider'),
      }).then(() => {
        setNotice(demo ? 'Subscription is active on this machine. Add Stripe or PayPal keys to charge live payments.' : 'Payment confirmed. Your plan is active.')
      })
    }
    if (status === 'cancel') setNotice('Checkout was canceled. No charge was made.')
    setParams({}, { replace: true })
    // confirm once from the return URL, then clear the query string
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, setParams])

  const checkout = useMutation({
    mutationFn: (body: { planId: string; interval: BillingInterval; provider: 'card' | 'stripe' | 'paypal' }) =>
      api<{ url: string; demo?: boolean; note?: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      if (res.note) setNotice(res.note)
      if (res.url) window.location.href = res.url
    },
    onError: (err) => setNotice(err instanceof Error ? err.message : 'Checkout failed.'),
  })

  const cancel = useMutation({
    mutationFn: () => api('/api/billing/cancel', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing'] })
      setNotice('You are back on the free plan. Paid access stays until the period ends if a live provider is connected.')
    },
  })

  const current = billing.data?.subscription
  const plans = catalog.data?.plans ?? []
  const providers = catalog.data?.providers ?? billing.data?.providers ?? { stripe: false, paypal: false }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Billing"
        title={role === 'employer' ? 'Hiring subscription' : 'Candidate subscription'}
        description="Pay with card through Stripe, or with PayPal. Apple Pay and Google Pay appear in Stripe Checkout when available."
      />

      {notice ? (
        <Card className="border-[var(--copper)]/40 bg-[var(--copper)]/5 text-sm">{notice}</Card>
      ) : null}

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Current plan</p>
          <h2 className="mt-1 text-2xl">{billing.data?.plan?.name ?? 'Free'}</h2>
          <p className="text-sm text-muted-foreground">
            {current?.provider ? `Paid with ${current.provider === 'demo' ? 'demo checkout' : current.provider}` : 'No payment method on file'}
            {current?.currentPeriodEnd ? ` · renews ${new Date(current.currentPeriodEnd).toLocaleDateString()}` : ''}
          </p>
        </div>
        {current && isPaidPlan(current.planId) && current.status !== 'canceled' ? (
          <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            Cancel subscription
          </Button>
        ) : null}
      </Card>

      <div className="flex gap-2">
        <Button variant={interval === 'month' ? 'default' : 'outline'} onClick={() => setInterval('month')}>
          Monthly
        </Button>
        <Button variant={interval === 'year' ? 'default' : 'outline'} onClick={() => setInterval('year')}>
          Yearly · 2 months free
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => {
          const active = current?.planId === plan.id && current.status !== 'canceled'
          const amount = interval === 'year' ? plan.yearlyCents : plan.monthlyCents
          return (
            <Card key={plan.id} className={plan.highlighted ? 'border-[var(--forest)]' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl">{plan.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                </div>
                {active ? <Badge tone="good">Active</Badge> : plan.highlighted ? <Badge tone="copper">Popular</Badge> : null}
              </div>
              <p className="mt-4 font-serif text-4xl">
                {formatMoney(amount)}
                {amount > 0 ? (
                  <span className="ml-1 text-base font-sans text-muted-foreground">/{interval === 'year' ? 'year' : 'mo'}</span>
                ) : null}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.monthlyCents > 0 && !active ? (
                <div className="mt-6 space-y-2">
                  <Button
                    variant="copper"
                    className="w-full"
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate({ planId: plan.id, interval, provider: 'card' })}
                  >
                    <CreditCard className="size-4" />
                    Pay with card
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate({ planId: plan.id, interval, provider: 'stripe' })}
                  >
                    Checkout with Stripe
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-[#ffc439] text-[#003087] hover:bg-[#f5b82e]"
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate({ planId: plan.id, interval, provider: 'paypal' })}
                  >
                    PayPal
                  </Button>
                </div>
              ) : plan.monthlyCents === 0 && !active ? (
                <Button
                  className="mt-6 w-full"
                  variant="outline"
                  disabled={checkout.isPending}
                  onClick={() => checkout.mutate({ planId: plan.id, interval, provider: 'card' })}
                >
                  Stay on free
                </Button>
              ) : null}
            </Card>
          )
        })}
      </div>

      <Card>
        <h2>Accepted payment methods</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cards are processed by Stripe (Visa, Mastercard, American Express, and wallets). PayPal is a separate checkout.
          {!providers.stripe && !providers.paypal
            ? ' Keys are not in .env yet — checkout still activates a demo subscription so you can try the product.'
            : null}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Visa', 'Mastercard', 'Amex', 'Stripe', 'PayPal', 'Apple Pay', 'Google Pay'].map((label) => (
            <span key={label} className="rounded-full border border-border px-3 py-1 text-xs">
              {label}
            </span>
          ))}
        </div>
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          <li>Stripe: {providers.stripe ? 'live checkout enabled' : 'add STRIPE_SECRET_KEY'}</li>
          <li>PayPal: {providers.paypal ? 'live checkout enabled' : 'add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET'}</li>
        </ul>
      </Card>
    </div>
  )
}
