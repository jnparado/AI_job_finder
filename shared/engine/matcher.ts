import { skillOverlap } from '../skills'
import type {
  CandidateProfile,
  Job,
  JobMatch,
  MatchBreakdown,
} from '../types'
import { matchCategory } from '../types'
import { analyzeJob } from './analyzer'

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

const LEVEL: Record<string, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  lead: 4,
  staff: 4,
  manager: 5,
  executive: 6,
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  )
}

function titleScore(profile: CandidateProfile, job: Job): number {
  const want = tokens(`${profile.desiredTitle} ${profile.currentTitle} ${profile.headline}`)
  const got = tokens(job.title)
  if (want.size === 0) return 70
  let hits = 0
  for (const t of got) if (want.has(t)) hits += 1
  return clamp((hits / Math.max(got.size, 1)) * 140)
}

function salaryScore(profile: CandidateProfile, job: Job): number {
  if (job.salaryMax == null || job.salaryMin == null) return 72
  if (job.salaryMax < profile.salaryMin) {
    return clamp(50 - (profile.salaryMin - job.salaryMax) / 4000)
  }
  if (job.salaryMin >= profile.salaryMin) return 92
  return 80
}

function locationScore(profile: CandidateProfile, job: Job): number {
  if (job.remote && (profile.remoteWorldwide || profile.workModes.includes('remote')))
    return 100
  const locs = profile.locations.map((l) => l.toLowerCase())
  const loc = (job.location ?? '').toLowerCase()
  if (locs.some((l) => loc.includes(l) || l.includes(loc.split(',')[0] ?? '___')))
    return 90
  if (profile.country && loc.includes(profile.country.toLowerCase())) return 78
  if (profile.city && loc.includes(profile.city.toLowerCase())) return 88
  if (job.remote) return 82
  return profile.workModes.includes('hybrid') ? 55 : 30
}

function employmentScore(profile: CandidateProfile, job: Job): number {
  if (!job.employmentType) return 80
  return profile.employmentTypes.includes(job.employmentType) ? 100 : 35
}

function seniorityScore(profile: CandidateProfile, job: Job, analyzedSeniority: string): number {
  const a = LEVEL[profile.careerLevel] ?? 2
  const b = LEVEL[analyzedSeniority] ?? LEVEL[job.seniority ?? 'mid'] ?? 2
  const delta = Math.abs(a - b)
  if (delta === 0) return 100
  if (delta === 1) return 78
  return clamp(100 - delta * 28)
}

function experienceScore(years: number, required: number): number {
  if (!required) return 80
  if (years >= required) return clamp(90 + Math.min(years - required, 5) * 2)
  return clamp(100 - (required - years) * 18)
}

function goalsScore(profile: CandidateProfile, job: Job): number {
  const blob = `${job.title} ${job.description}`.toLowerCase()
  const goals = profile.careerGoals.toLowerCase()
  let score = 60
  if (!goals) return 70
  if (goals.includes('remote') && job.remote) score += 15
  if (goals.includes('full stack') && /full stack/.test(blob)) score += 15
  if (goals.includes('ai') && /ai|openai|agent|rag/.test(blob)) score += 12
  if (goals.includes('manager') === false && job.seniority === 'manager') score -= 20
  return clamp(score)
}

export function matchJob(job: Job, profile: CandidateProfile): JobMatch {
  const analysis = analyzeJob(job)
  const candidateSkills = [...profile.skills, ...profile.aiSkills]
  const { matched, missing } = skillOverlap(candidateSkills, analysis.required_skills)
  const pref = skillOverlap(candidateSkills, analysis.preferred_skills)
  const breakdown: MatchBreakdown = {
    skills: analysis.required_skills.length
      ? clamp((matched.length / analysis.required_skills.length) * 100)
      : 70,
    experience: experienceScore(profile.yearsExperience, analysis.required_experience),
    title: titleScore(profile, job),
    salary: salaryScore(profile, job),
    location: locationScore(profile, job),
    employment: employmentScore(profile, job),
    seniority: seniorityScore(profile, job, analysis.seniority),
    careerGoals: goalsScore(profile, job),
  }
  const score = Math.round(
    breakdown.skills * 0.3 +
      breakdown.experience * 0.2 +
      breakdown.title * 0.15 +
      breakdown.salary * 0.1 +
      breakdown.location * 0.1 +
      breakdown.employment * 0.05 +
      breakdown.seniority * 0.05 +
      breakdown.careerGoals * 0.05,
  )
  const category = matchCategory(score)
  const stars =
    score >= 90 ? 5 : score >= 80 ? 4 : score >= 70 ? 3 : score >= 60 ? 2 : 1
  const name = `${profile.firstName} ${profile.lastName}`.trim() || 'you'
  const summary = [
    ...matched.map((s) => `${s} experience`),
    profile.yearsExperience
      ? `${profile.yearsExperience} years experience`
      : null,
    job.remote ? 'Remote position' : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const recommendation =
    score >= 90
      ? `Strongly recommended. ${name}'s core technical experience closely matches the requirements.`
      : score >= 80
        ? 'Recommended. Strong overlap with a few gaps to address honestly.'
        : score >= 70
          ? 'A credible fit if the domain excites you. Review the gaps before applying.'
          : 'Below the usual recommendation bar unless you have a specific reason to pursue it.'

  return {
    job,
    analysis,
    score: clamp(score),
    category,
    breakdown,
    matchedSkills: matched,
    missingSkills: missing,
    preferredMissing: pref.missing,
    summary,
    recommendation,
    stars,
  }
}

export function matchJobs(jobs: Job[], profile: CandidateProfile): JobMatch[] {
  return jobs.map((job) => matchJob(job, profile)).sort((a, b) => b.score - a.score)
}
