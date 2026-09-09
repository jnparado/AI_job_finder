import type { OfficialBoard } from './types'

export function isAtelierJob(job: { source?: string; employerId?: string | null }) {
  return job.source === 'atelier' || Boolean(job.employerId)
}

function isHttp(url?: string) {
  return Boolean(url?.startsWith('http://') || url?.startsWith('https://'))
}

function isSearchPage(url: string) {
  return /\/jobs\/search|\/jobs\?q=|\/nx\/search\/jobs|sc\.keyword=|\/jobs\/\?keyword=/.test(url)
}

export function isUsableListingUrl(url?: string) {
  if (!url || !isHttp(url)) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host === 'example' || host.endsWith('.example') || host === 'example.com' || host.endsWith('.example.com')) {
      return false
    }
    if (/linkedin\.com\/jobs\/view\/[a-z][a-z0-9-]*$/i.test(url) && !/\d{6,}/.test(url)) return false
    if (/indeed\.com\/viewjob\?jk=[a-z][a-z-]+$/i.test(url)) return false
    return true
  } catch {
    return false
  }
}

export function officialApplyLinks(job: { title: string; company?: string }): OfficialBoard[] {
  const q = encodeURIComponent([job.title, job.company].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim())
  return [
    { source: 'linkedin', label: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${q}` },
    { source: 'indeed', label: 'Indeed', url: `https://www.indeed.com/jobs?q=${q}` },
    { source: 'upwork', label: 'Upwork', url: `https://www.upwork.com/nx/search/jobs/?q=${q}` },
    { source: 'freelancer', label: 'Freelancer', url: `https://www.freelancer.com/jobs/?keyword=${q}` },
    { source: 'glassdoor', label: 'Glassdoor', url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}` },
  ]
}

export function originalListingUrl(job: {
  title?: string
  company?: string
  source?: string
  applicationUrl?: string
  sources?: { url?: string }[]
}) {
  const urls = [...(job.sources ?? []).map((s) => s.url), job.applicationUrl].filter(
    (url): url is string => isUsableListingUrl(url),
  )
  return urls.find((url) => !isSearchPage(url)) ?? urls[0]
}

export function listingUrl(job: {
  title: string
  company?: string
  source?: string
  applicationUrl?: string
  sources?: { url?: string }[]
}) {
  const listing = originalListingUrl(job)
  if (listing) return listing
  const boards = officialApplyLinks(job)
  return boards.find((b) => b.source === job.source)?.url ?? boards[0]?.url
}
