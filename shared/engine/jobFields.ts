import type { CareerLevel, Currency, EmploymentType, Job, WorkMode } from '../types'

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function inferEmployment(raw?: string): EmploymentType | undefined {
  const t = (raw ?? '').toLowerCase()
  if (/freelance/.test(t)) return 'freelance'
  if (/contract|contractor|temporary/.test(t)) return 'contract'
  if (/part[-\s]?time/.test(t)) return 'part-time'
  if (/full[-\s]?time/.test(t)) return 'full-time'
  return undefined
}

export function inferSeniority(
  title: string,
  extra = '',
): CareerLevel | 'intern' | 'staff' | undefined {
  const t = `${title} ${extra}`
  if (/\bintern\b/i.test(t)) return 'intern'
  if (/\b(staff|principal)\b/i.test(t)) return 'staff'
  if (/\b(executive|director|vp|cto|ceo|cpo)\b/i.test(t)) return 'executive'
  if (/\bmanager\b/i.test(t)) return 'manager'
  if (/\blead\b/i.test(t)) return 'lead'
  if (/\b(senior|sr\.?)\b/i.test(t)) return 'senior'
  if (/\b(junior|jr\.?|entry|graduate)\b/i.test(t)) return 'junior'
  return 'mid'
}

export function inferWorkMode(location?: string, remoteFlag?: boolean): WorkMode {
  if (remoteFlag) return 'remote'
  const t = location ?? ''
  if (/\bhybrid\b/i.test(t)) return 'hybrid'
  if (/\b(remote|worldwide|anywhere|distributed|work from home)\b/i.test(t)) return 'remote'
  return 'onsite'
}

export function inferCurrency(raw?: string): Currency {
  const t = (raw ?? '').toUpperCase()
  if (t === 'EUR' || t.includes('€')) return 'EUR'
  if (t === 'GBP' || t.includes('£')) return 'GBP'
  if (t === 'CAD') return 'CAD'
  if (t === 'AUD') return 'AUD'
  if (t === 'PHP') return 'PHP'
  if (t === 'CHF') return 'CHF'
  return 'USD'
}

export function parseSalary(raw?: string): { min?: number; max?: number } {
  if (!raw) return {}
  const nums = [...raw.replace(/,/g, '').matchAll(/(\d+(?:\.\d+)?)(\s*[kK])?/g)].map((m) => {
    const n = Number(m[1])
    return m[2] ? n * 1000 : n
  })
  if (!nums.length) return {}
  const yearly = nums.map((n) => (n > 0 && n < 500 ? n * 1000 : n)).filter((n) => n >= 10000)
  if (!yearly.length) return {}
  return { min: Math.min(...yearly), max: Math.max(...yearly) }
}

export function postedAt(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

export function asJob(partial: Omit<Job, 'skills'> & { skills?: string[] }): Job {
  const description = stripHtml(partial.description)
  const location = partial.location?.replace(/\s+/g, ' ').trim()
  const remote = partial.remote || inferWorkMode(location, partial.remote) === 'remote'
  return {
    ...partial,
    description,
    location,
    remote,
    workMode: partial.workMode ?? inferWorkMode(location, remote),
    employmentType: partial.employmentType ?? inferEmployment(`${partial.title} ${description}`),
    seniority: partial.seniority ?? inferSeniority(partial.title, description),
    skills: partial.skills ?? [],
    sources: partial.sources ?? [{ source: partial.source, url: partial.applicationUrl }],
  }
}
