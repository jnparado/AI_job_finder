import { extractSkills } from '../skills'
import type { Job, JobAnalysis } from '../types'

const SENIORITY_RE = [
  { level: 'executive', re: /\b(executive|director|vp)\b/i },
  { level: 'manager', re: /\bengineering manager\b|\bmanager\b/i },
  { level: 'lead', re: /\b(staff|principal|lead)\b/i },
  { level: 'senior', re: /\b(senior|sr\.?)\b/i },
  { level: 'junior', re: /\b(junior|intern|jr\.?)\b/i },
]

export function analyzeJob(job: Job): JobAnalysis {
  const blob = `${job.title}\n${job.description}`
  const years = blob.match(/(\d+)\+?\s+years/i)
  const required_experience =
    job.requiredExperience ?? (years ? Number(years[1]) : 0)
  const extracted = extractSkills(blob)
  const preferred = extracted.filter((s) =>
    new RegExp(`(preferred|plus|nice to have).{0,80}${s}`, 'i').test(blob) ||
    /AWS|Docker|Kubernetes/.test(s) && /preferred/i.test(blob),
  )
  const listedPreferred = job.preferredSkills ?? preferred
  const required =
    job.requiredSkills ??
    extracted.filter((s) => !listedPreferred.includes(s))
  const seniority =
    job.seniority ??
    SENIORITY_RE.find((s) => s.re.test(blob))?.level ??
    'mid'

  return {
    required_experience,
    required_skills: required.length ? required : job.skills.slice(0, Math.max(job.skills.length - 2, 1)),
    preferred_skills:
      listedPreferred.length > 0
        ? listedPreferred
        : job.skills.slice(-2),
    seniority,
  }
}
