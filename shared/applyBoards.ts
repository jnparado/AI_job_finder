import type { OfficialBoard } from './types'

export function isAtelierJob(job: { source?: string; employerId?: string | null }) {
  return job.source === 'atelier' || Boolean(job.employerId)
}

export function listingUrl(job: { applicationUrl?: string }) {
  return job.applicationUrl?.startsWith('http') ? job.applicationUrl : undefined
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
