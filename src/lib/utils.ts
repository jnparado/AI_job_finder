import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Currency } from '@shared/types'
import { currencyForLocation } from './countries'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function salaryCurrency(currency = 'PHP'): Currency {
  const raw = String(currency || 'PHP').trim()
  const fromPlace = currencyForLocation(raw)
  if (fromPlace) return fromPlace
  const code = raw.toUpperCase().replace(/[\s-]+/g, '')
  if (code === 'PHP' || code.includes('PESO') || raw.includes('₱')) return 'PHP'
  if (code === 'EUR' || raw.includes('€')) return 'EUR'
  if (code === 'GBP' || raw.includes('£')) return 'GBP'
  if (code === 'CAD') return 'CAD'
  if (code === 'AUD') return 'AUD'
  if (code === 'CHF') return 'CHF'
  if (code === 'USD' || raw.includes('$')) return 'USD'
  try {
    Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(0)
    if (code === 'PHP' || code === 'USD' || code === 'EUR' || code === 'GBP' || code === 'CAD' || code === 'AUD' || code === 'CHF') {
      return code
    }
  } catch {
    /* fallback */
  }
  return 'PHP'
}

export function paySymbol(currency = 'PHP'): string {
  const code = salaryCurrency(currency)
  if (code === 'PHP') return '₱'
  if (code === 'EUR') return '€'
  if (code === 'GBP') return '£'
  if (code === 'CHF') return 'CHF '
  if (code === 'CAD') return 'CA$'
  if (code === 'AUD') return 'A$'
  return '$'
}

export function payCodeLabel(currency = 'PHP'): string {
  const code = salaryCurrency(currency)
  if (code === 'PHP') return 'PHP · peso'
  if (code === 'USD') return 'USD'
  if (code === 'EUR') return 'EUR'
  if (code === 'GBP') return 'GBP'
  if (code === 'CAD') return 'CAD'
  if (code === 'AUD') return 'AUD'
  return 'CHF'
}

export function money(n?: number, currency = 'PHP'): string {
  if (n == null) return '—'
  const code = salaryCurrency(currency)
  const amount = Math.round(n).toLocaleString(code === 'PHP' ? 'en-PH' : 'en-US')
  if (code === 'PHP') return `₱${amount}`
  if (code === 'EUR') return `€${amount}`
  if (code === 'GBP') return `£${amount}`
  if (code === 'CHF') return `CHF ${amount}`
  if (code === 'CAD') return `CA$${amount}`
  if (code === 'AUD') return `A$${amount}`
  return `$${amount}`
}

export function salaryMoney(n?: number, currency = 'PHP'): string {
  return money(n, salaryCurrency(currency || 'PHP'))
}

export function compactPay(n: number, currency = 'USD'): string {
  const code = salaryCurrency(currency)
  const abs = Math.abs(n)
  const amount = abs >= 1000 ? `${Math.round(abs / 1000)}k` : String(Math.round(abs))
  if (code === 'CHF') return `CHF ${amount}`
  return `${paySymbol(code)}${amount}`
}

export function moneyBand(min?: number, max?: number, currency = 'USD'): string {
  if (min == null || max == null) return 'Salary not posted'
  const code = salaryCurrency(currency)
  return `${compactPay(min, code)}–${compactPay(max, code)}`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'You'
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

export function prettyStatus(status: string): string {
  return status.replaceAll('_', ' ')
}

export function profileCompleteness(profile: {
  firstName: string
  lastName: string
  desiredTitle: string
  currentTitle: string
  yearsExperience: number
  industry: string
  skills: string[]
  aiSkills: string[]
  careerGoals: string
  city: string
  country: string
  locations: string[]
  resumeText: string
  parsedProfile?: unknown
}): number {
  const checks = [
    Boolean(profile.firstName && profile.lastName),
    Boolean(profile.desiredTitle || profile.currentTitle),
    profile.yearsExperience > 0,
    Boolean(profile.industry),
    profile.skills.length >= 4,
    profile.aiSkills.length > 0,
    Boolean(profile.careerGoals),
    Boolean(profile.city || profile.country),
    profile.locations.length > 0,
    Boolean(profile.resumeText || profile.parsedProfile),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function postedLabel(postedAt?: string): string {
  if (!postedAt) return 'Listed recently'
  const then = new Date(postedAt).getTime()
  if (Number.isNaN(then)) return 'Listed recently'
  const days = Math.round((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'Listed today'
  if (days === 1) return 'Listed yesterday'
  if (days < 21) return `Listed ${days} days ago`
  return `Listed ${new Date(postedAt).toLocaleDateString()}`
}

export function textSnippet(value: string, max = 220): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`
}
