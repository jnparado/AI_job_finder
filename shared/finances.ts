import type { Currency } from './types'

export type LedgerKind = 'from_employer' | 'withdraw'
export type LedgerStatus = 'pending' | 'available' | 'sent' | 'failed'

export interface LedgerEntry {
  id: string
  candidateId: string
  employerId?: string
  applicationId?: string
  jobTitle?: string
  company?: string
  kind: LedgerKind
  status: LedgerStatus
  amount: number
  currency: Currency
  note?: string
  createdAt: string
}

export interface FinanceOverview {
  currency: Currency
  pending: number
  available: number
  withdrawn: number
  received: number
  entries: LedgerEntry[]
}

export function emptyFinance(currency: Currency = 'USD'): FinanceOverview {
  return { currency, pending: 0, available: 0, withdrawn: 0, received: 0, entries: [] }
}

export function summarizeLedger(entries: LedgerEntry[], currency: Currency = 'USD'): FinanceOverview {
  const mine = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  let pending = 0
  let incoming = 0
  let withdrawn = 0
  for (const row of mine) {
    if (row.kind === 'from_employer') {
      incoming += row.amount
      if (row.status === 'pending') pending += row.amount
    }
    if (row.kind === 'withdraw' && row.status !== 'failed') withdrawn += row.amount
  }
  return {
    currency,
    pending,
    available: Math.max(0, incoming - pending - withdrawn),
    withdrawn,
    received: incoming,
    entries: mine,
  }
}
