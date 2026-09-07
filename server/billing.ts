import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  emptySubscription,
  isPaidPlan,
  planById,
  priceCents,
  type BillingInterval,
  type BillingProvider,
  type BillingRole,
  type Subscription,
} from '../shared/billing'
import { memory } from './memory'
import { supabaseAdmin } from './supabase'

const paypalPlans = new Map<string, string>()

export function billingConfigured() {
  return {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
  }
}

export function appOrigin(headerOrigin?: string): string {
  const allowed = [
    process.env.APP_URL,
    process.env.VITE_APP_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/$/, ''))
  const origin = (headerOrigin ?? '').replace(/\/$/, '')
  if (origin && allowed.includes(origin)) return origin
  return allowed[0] ?? 'http://localhost:5173'
}

export async function loadSubscription(userId: string, role: BillingRole): Promise<Subscription> {
  const mem = memory.getSubscription(userId)
  if (mem) return mem
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
      if (data) {
        const row: Subscription = {
          userId,
          planId: String(data.plan_id),
          status: (data.status as Subscription['status']) ?? 'active',
          provider: data.provider as BillingProvider | undefined,
          providerRef: data.provider_ref ? String(data.provider_ref) : undefined,
          interval: data.interval === 'year' ? 'year' : 'month',
          currentPeriodEnd: data.current_period_end ? String(data.current_period_end) : undefined,
          updatedAt: String(data.updated_at ?? new Date().toISOString()),
        }
        memory.setSubscription(row)
        return row
      }
    } catch {
      /* column/table may be missing until schema is applied */
    }
  }
  return emptySubscription(userId, role)
}

export async function saveSubscription(next: Subscription): Promise<Subscription> {
  memory.setSubscription(next)
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('subscriptions').upsert({
        user_id: next.userId,
        plan_id: next.planId,
        status: next.status,
        provider: next.provider ?? null,
        provider_ref: next.providerRef ?? null,
        interval: next.interval,
        current_period_end: next.currentPeriodEnd ?? null,
        updated_at: next.updatedAt,
      })
    } catch {
      /* demo still works from memory */
    }
  }
  return next
}

export async function activateSubscription(
  userId: string,
  planId: string,
  interval: BillingInterval,
  provider: BillingProvider,
  providerRef?: string,
): Promise<Subscription> {
  const period = new Date()
  period.setMonth(period.getMonth() + (interval === 'year' ? 12 : 1))
  return saveSubscription({
    userId,
    planId,
    status: 'active',
    provider,
    providerRef,
    interval,
    currentPeriodEnd: period.toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function cancelSubscription(userId: string, role: BillingRole): Promise<Subscription> {
  const current = await loadSubscription(userId, role)
  return saveSubscription({
    ...current,
    planId: role === 'employer' ? 'employer-free' : 'candidate-free',
    status: 'canceled',
    updatedAt: new Date().toISOString(),
  })
}

function stripeAuth() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY.')
  return key
}

export async function createStripeCheckout(opts: {
  userId: string
  email: string
  planId: string
  interval: BillingInterval
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string; sessionId: string }> {
  const plan = planById(opts.planId)
  if (!plan || !isPaidPlan(plan.id)) throw new Error('Choose a paid plan.')
  const cents = priceCents(plan, opts.interval)
  const body = new URLSearchParams({
    mode: 'subscription',
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    customer_email: opts.email,
    'client_reference_id': opts.userId,
    'metadata[userId]': opts.userId,
    'metadata[planId]': opts.planId,
    'metadata[interval]': opts.interval,
    'subscription_data[metadata][userId]': opts.userId,
    'subscription_data[metadata][planId]': opts.planId,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][price_data][recurring][interval]': opts.interval,
    'line_items[0][price_data][product_data][name]': `Atelier ${plan.name}`,
    'line_items[0][price_data][product_data][description]': plan.tagline,
    'payment_method_types[0]': 'card',
  })
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } }
  if (!res.ok || !data.url || !data.id) {
    throw new Error(data.error?.message ?? 'Could not start Stripe Checkout.')
  }
  return { url: data.url, sessionId: data.id }
}

export async function confirmStripeSession(sessionId: string): Promise<Subscription | null> {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${stripeAuth()}` },
  })
  const data = (await res.json()) as {
    payment_status?: string
    status?: string
    client_reference_id?: string
    metadata?: { userId?: string; planId?: string; interval?: string }
    subscription?: string
  }
  if (!res.ok) throw new Error('Stripe session not found.')
  const userId = data.client_reference_id || data.metadata?.userId
  const planId = data.metadata?.planId
  const interval = data.metadata?.interval === 'year' ? 'year' : 'month'
  if (!userId || !planId) return null
  if (data.payment_status !== 'paid' && data.status !== 'complete') return null
  return activateSubscription(userId, planId, interval, 'stripe', data.subscription || sessionId)
}

function verifyStripeSignature(raw: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [k, ...rest] = part.split('=')
      return [k, rest.join('=')]
    }),
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'))
  } catch {
    return false
  }
}

export async function handleStripeWebhook(raw: string, signature: string | undefined): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (secret) {
    if (!signature || !verifyStripeSignature(raw, signature, secret)) {
      throw new Error('Invalid Stripe signature.')
    }
  }
  const event = JSON.parse(raw) as {
    type?: string
    data?: { object?: Record<string, unknown> }
  }
  const obj = event.data?.object ?? {}
  if (event.type === 'checkout.session.completed') {
    const userId = String(obj.client_reference_id ?? (obj.metadata as { userId?: string } | undefined)?.userId ?? '')
    const meta = (obj.metadata ?? {}) as { planId?: string; interval?: string }
    if (userId && meta.planId) {
      await activateSubscription(
        userId,
        meta.planId,
        meta.interval === 'year' ? 'year' : 'month',
        'stripe',
        String(obj.subscription ?? obj.id ?? ''),
      )
    }
    return
  }
  if (event.type === 'customer.subscription.deleted') {
    const meta = (obj.metadata ?? {}) as { userId?: string }
    if (meta.userId) {
      const current = memory.getSubscription(meta.userId)
      if (current) {
        await saveSubscription({
          ...current,
          status: 'canceled',
          planId: current.planId.startsWith('employer') ? 'employer-free' : 'candidate-free',
          updatedAt: new Date().toISOString(),
        })
      }
    }
  }
}

function paypalBase() {
  return process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

async function paypalToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.')
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = (await res.json()) as { access_token?: string; error_description?: string }
  if (!res.ok || !data.access_token) throw new Error(data.error_description ?? 'PayPal auth failed.')
  return data.access_token
}

async function paypalJson(path: string, init: RequestInit = {}) {
  const token = await paypalToken()
  const res = await fetch(`${paypalBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const msg =
      (data.message as string) ||
      (Array.isArray(data.details) ? JSON.stringify(data.details) : '') ||
      'PayPal request failed.'
    throw new Error(msg)
  }
  return data
}

async function paypalPlanId(planId: string, interval: BillingInterval): Promise<string> {
  const cacheKey = `${planId}:${interval}`
  const cached = paypalPlans.get(cacheKey)
  if (cached) return cached
  const plan = planById(planId)
  if (!plan) throw new Error('Unknown plan.')
  const product = await paypalJson('/v1/catalogs/products', {
    method: 'POST',
    body: JSON.stringify({
      name: `Atelier ${plan.name}`,
      description: plan.tagline,
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  })
  const productId = String(product.id)
  const billing = await paypalJson('/v1/billing/plans', {
    method: 'POST',
    body: JSON.stringify({
      product_id: productId,
      name: `Atelier ${plan.name} ${interval}`,
      billing_cycles: [
        {
          frequency: { interval_unit: interval === 'year' ? 'YEAR' : 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: (priceCents(plan, interval) / 100).toFixed(2), currency_code: 'USD' },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
      },
    }),
  })
  const id = String(billing.id)
  paypalPlans.set(cacheKey, id)
  return id
}

export async function createPayPalCheckout(opts: {
  userId: string
  planId: string
  interval: BillingInterval
  returnUrl: string
  cancelUrl: string
}): Promise<{ url: string; subscriptionId: string }> {
  const plan = planById(opts.planId)
  if (!plan || !isPaidPlan(plan.id)) throw new Error('Choose a paid plan.')
  const paypalPlan = await paypalPlanId(opts.planId, opts.interval)
  const data = await paypalJson('/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: paypalPlan,
      custom_id: `${opts.userId}:${opts.planId}:${opts.interval}`,
      application_context: {
        brand_name: 'Atelier',
        user_action: 'SUBSCRIBE_NOW',
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  })
  const links = (data.links as { rel: string; href: string }[]) ?? []
  const url = links.find((l) => l.rel === 'approve')?.href
  const subscriptionId = String(data.id ?? '')
  if (!url || !subscriptionId) throw new Error('PayPal did not return an approval link.')
  return { url, subscriptionId }
}

export async function confirmPayPalSubscription(subscriptionId: string): Promise<Subscription | null> {
  const data = await paypalJson(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`)
  const status = String(data.status ?? '')
  const custom = String(data.custom_id ?? '')
  const [userId, planId, intervalRaw] = custom.split(':')
  if (!userId || !planId) return null
  if (!['ACTIVE', 'APPROVED'].includes(status)) return null
  return activateSubscription(
    userId,
    planId,
    intervalRaw === 'year' ? 'year' : 'month',
    'paypal',
    subscriptionId,
  )
}
