import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function money(n?: number, currency = 'USD'): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function moneyBand(min?: number, max?: number, currency = 'USD'): string {
  if (min == null || max == null) return 'Salary not posted'
  const fmt = (v: number) => `$${Math.round(v / 1000)}k`
  return `${fmt(min)}–${fmt(max)} ${currency === 'USD' ? '' : currency}`.trim()
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
