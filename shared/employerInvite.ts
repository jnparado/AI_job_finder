import { sourceLabel } from './types'

export function employerInviteQuery(job: { company: string; title: string; source: string }) {
  return new URLSearchParams({
    role: 'employer',
    company: job.company,
    from: job.source,
    listing: job.title,
  }).toString()
}

export function employerJoinPath(job: { company: string; title: string; source: string }) {
  return `/join?${employerInviteQuery(job)}`
}

export function employerRegisterPath(job: { company: string; title: string; source: string }) {
  return `/register?${employerInviteQuery(job)}`
}

export function employerInviteNote(
  job: { company: string; title: string; source: string },
  origin = typeof window !== 'undefined' ? window.location.origin : '',
) {
  const platform = sourceLabel(job.source)
  const link = `${origin}${employerJoinPath(job)}`
  return [
    `${job.company} is invited to hire on Atelier.`,
    '',
    `A candidate matched your ${job.title} listing on ${platform}. Create a free hiring account to receive approved packets in your inbox. Nothing is sent until the candidate approves.`,
    '',
    link,
  ].join('\n')
}
