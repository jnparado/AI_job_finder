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
