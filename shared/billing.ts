export type BillingRole = 'candidate' | 'employer'
export type BillingInterval = 'month' | 'year'
export type BillingProvider = 'stripe' | 'paypal' | 'card' | 'demo'
export type SubscriptionStatus = 'none' | 'active' | 'trialing' | 'past_due' | 'canceled'

export interface Plan {
  id: string
  role: BillingRole
  name: string
  tagline: string
  monthlyCents: number
  yearlyCents: number
  features: string[]
  highlighted?: boolean
}

export interface Subscription {
  userId: string
  planId: string
  status: SubscriptionStatus
  provider?: BillingProvider
  providerRef?: string
  interval: BillingInterval
  currentPeriodEnd?: string
  updatedAt: string
}

export const PLANS: Plan[] = [
  {
    id: 'candidate-free',
    role: 'candidate',
    name: 'Free',
    tagline: 'Start matching and prepare a few packets.',
    monthlyCents: 0,
    yearlyCents: 0,
    features: ['Live job matching', '5 AI applications / month', 'Resume parse & score', 'Official listing handoff'],
  },
  {
    id: 'candidate-plus',
    role: 'candidate',
    name: 'Plus',
    tagline: 'Unlimited packets, daily search, interview coach.',
    monthlyCents: 1900,
    yearlyCents: 19000,
    highlighted: true,
    features: [
      'Unlimited AI applications',
      'Daily job agent',
      'Interview & career coach',
      'Send packets to Atelier employers',
    ],
  },
  {
    id: 'employer-free',
    role: 'employer',
    name: 'Starter',
    tagline: 'Post one role and try the inbox.',
    monthlyCents: 0,
    yearlyCents: 0,
    features: ['1 open job post', 'Candidate inbox', 'Status updates', 'Atelier apply channel'],
  },
  {
    id: 'employer-hiring',
    role: 'employer',
    name: 'Hiring',
    tagline: 'Unlimited roles and a full applicant inbox.',
    monthlyCents: 4900,
    yearlyCents: 49000,
    highlighted: true,
    features: ['Unlimited job posts', 'Unlimited inbox', 'Priority listing in search', 'Status + notifications'],
  },
]

export function plansFor(role: BillingRole): Plan[] {
  return PLANS.filter((p) => p.role === role)
}

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export function defaultPlanId(role: BillingRole): string {
  return role === 'employer' ? 'employer-free' : 'candidate-free'
}

export function isPaidPlan(planId: string): boolean {
  const plan = planById(planId)
  return Boolean(plan && plan.monthlyCents > 0)
}

export function priceCents(plan: Plan, interval: BillingInterval): number {
  return interval === 'year' ? plan.yearlyCents : plan.monthlyCents
}

export function formatMoney(cents: number): string {
  if (cents <= 0) return 'Free'
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

export function emptySubscription(userId: string, role: BillingRole): Subscription {
  return {
    userId,
    planId: defaultPlanId(role),
    status: 'active',
    interval: 'month',
    updatedAt: new Date().toISOString(),
  }
}
