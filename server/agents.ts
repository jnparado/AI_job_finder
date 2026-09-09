import { matchCategory } from '../shared/types'
import type {
  CandidateProfile,
  CareerInsights,
  Job,
  JobMatch,
  ParsedResume,
  PreparedPacket,
} from '../shared/types'
import { completeJson, openaiReady } from './ai'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function str(value: unknown): string {
  return value == null ? '' : String(value)
}

function strs(value: unknown): string[] {
  return Array.isArray(value) ? value.map(str).map((s) => s.trim()).filter(Boolean) : []
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

function profileSnapshot(profile: CandidateProfile) {
  return {
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    headline: profile.headline,
    currentTitle: profile.currentTitle,
    desiredTitle: profile.desiredTitle,
    yearsExperience: profile.yearsExperience,
    careerLevel: profile.careerLevel,
    skills: profile.skills,
    aiSkills: profile.aiSkills,
    workModes: profile.workModes,
    employmentTypes: profile.employmentTypes,
    salaryMin: profile.salaryMin,
    salaryDesired: profile.salaryDesired,
    currency: profile.currency,
    locations: profile.locations,
    remoteWorldwide: profile.remoteWorldwide,
    careerGoals: profile.careerGoals,
  }
}

export async function planSearch(profile: CandidateProfile): Promise<{ query: string; rationale?: string }> {
  const fallback = [profile.desiredTitle || profile.currentTitle || profile.headline || 'software engineer', ...profile.skills.slice(0, 2)]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!openaiReady() || (!profile.desiredTitle && !profile.skills.length)) return { query: fallback }
  const json = await completeJson<{ query?: string; rationale?: string }>(
    'agent_decision',
    'You are the search planner for a job-discovery agent. Choose a short public job-board query (3–8 words). Never suggest scraping or unofficial automation.',
    JSON.stringify(profileSnapshot(profile)),
  )
  const query = str(json?.query).replace(/\s+/g, ' ').trim()
  return { query: query || fallback, rationale: json?.rationale }
}

export async function parseJobs(jobs: Job[]): Promise<Job[]> {
  if (!openaiReady()) return jobs
  const need = jobs.filter((j) => j.skills.length < 3 && j.description.length > 80).slice(0, 20)
  if (!need.length) return jobs
  const json = await completeJson<{ jobs?: unknown[] }>(
    'job_parse',
    'Extract structured fields from job listings. Only use skills clearly present in the text. JSON shape: { "jobs": [{ "id", "skills": string[], "seniority", "employmentType", "requiredExperience", "remote" }] }',
    JSON.stringify(
      need.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        description: j.description.slice(0, 1400),
      })),
    ),
  )
  const rows = Array.isArray(json?.jobs) ? json.jobs : []
  const byId = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const rec = asRecord(row)
    if (rec?.id) byId.set(str(rec.id), rec)
  }
  return jobs.map((job) => {
    const rec = byId.get(job.id)
    if (!rec) return job
    const skills = [...new Set([...job.skills, ...strs(rec.skills)])]
    const seniority = str(rec.seniority) || job.seniority
    const employmentType = str(rec.employmentType) || job.employmentType
    return {
      ...job,
      skills,
      seniority: (seniority as Job['seniority']) ?? job.seniority,
      employmentType: (employmentType as Job['employmentType']) ?? job.employmentType,
      requiredExperience: Number(rec.requiredExperience) || job.requiredExperience,
      remote: rec.remote == null ? job.remote : Boolean(rec.remote),
    }
  })
}

export async function extractResume(text: string, local: ParsedResume): Promise<ParsedResume> {
  if (!openaiReady() || text.trim().length < 40) return local
  const json = await completeJson<ParsedResume>(
    'resume_parse',
    'Extract a candidate profile. JSON keys: name, headline, experience_years, skills (string[]), ai_skills (string[]), industries (string[]), summary. Do not invent employers or skills.',
    text.slice(0, 12000),
  )
  if (!json) return local
  return {
    name: json.name || local.name,
    headline: json.headline || local.headline,
    experience_years: Number(json.experience_years) || local.experience_years,
    skills: json.skills?.length ? json.skills : local.skills,
    ai_skills: json.ai_skills?.length ? json.ai_skills : local.ai_skills,
    industries: json.industries?.length ? json.industries : local.industries,
    summary: json.summary || local.summary,
    experience: json.experience?.length ? json.experience : local.experience,
  }
}

export async function enrichMatches(matches: JobMatch[], profile: CandidateProfile): Promise<JobMatch[]> {
  if (!openaiReady() || !matches.length) return matches
  const top = matches.filter((m) => m.score >= 70).slice(0, 10)
  const hard = matches.filter((m) => m.score >= 55 && m.score < 80).slice(0, 8)
  const [recs, hardReviews] = await Promise.all([
    top.length
      ? completeJson<{ matches?: unknown[] }>(
          'recommend',
          'Write short match explanations. JSON: { "matches": [{ "id", "summary", "recommendation" }] }. Never claim skills the candidate did not list.',
          JSON.stringify({
            profile: profileSnapshot(profile),
            matches: top.map((m) => ({
              id: m.job.id,
              title: m.job.title,
              company: m.job.company,
              score: m.score,
              matched: m.matchedSkills,
              missing: m.missingSkills,
            })),
          }),
        )
      : Promise.resolve(null),
    hard.length
      ? completeJson<{ matches?: unknown[] }>(
          'difficult_match',
          'Re-evaluate borderline job matches. JSON: { "matches": [{ "id", "score", "recommendation", "note" }] }. Keep scores honest. Do not inflate a poor fit.',
          JSON.stringify({
            profile: profileSnapshot(profile),
            matches: hard.map((m) => ({
              id: m.job.id,
              title: m.job.title,
              company: m.job.company,
              score: m.score,
              matched: m.matchedSkills,
              missing: m.missingSkills,
              breakdown: m.breakdown,
            })),
          }),
        )
      : Promise.resolve(null),
  ])

  const recById = new Map<string, Record<string, unknown>>()
  for (const row of recs?.matches ?? []) {
    const rec = asRecord(row)
    if (rec?.id) recById.set(str(rec.id), rec)
  }
  const hardById = new Map<string, Record<string, unknown>>()
  for (const row of hardReviews?.matches ?? []) {
    const rec = asRecord(row)
    if (rec?.id) hardById.set(str(rec.id), rec)
  }

  return matches.map((match) => {
    const rec = recById.get(match.job.id)
    const hardRec = hardById.get(match.job.id)
    let next = match
    if (rec) {
      next = {
        ...next,
        summary: str(rec.summary) || next.summary,
        recommendation: str(rec.recommendation) || next.recommendation,
        aiLane: 'terra',
      }
    }
    if (hardRec) {
      const solScore = Number(hardRec.score)
      const blended = Number.isFinite(solScore) && solScore > 0
        ? clamp(Math.round(match.score * 0.7 + solScore * 0.3))
        : next.score
      next = {
        ...next,
        score: blended,
        category: matchCategory(blended),
        recommendation: str(hardRec.recommendation) || next.recommendation,
        aiLane: 'sol',
        aiNote: str(hardRec.note) || next.aiNote,
      }
    }
    return next
  }).sort((a, b) => b.score - a.score)
}

export async function writePacket(match: JobMatch, profile: CandidateProfile, local: PreparedPacket): Promise<PreparedPacket> {
  if (!openaiReady()) return { ...local, aiLane: undefined }
  const json = await completeJson<{
    tailoredResume?: string
    coverLetter?: string
    recruiterMessage?: string
    answers?: { question?: string; answer?: string }[]
  }>(
    'cover_letter',
    'Write an application packet from confirmed experience only. JSON keys: tailoredResume, coverLetter, recruiterMessage, answers [{question, answer}]. Never claim unconfirmed skills.',
    JSON.stringify({
      profile: profileSnapshot(profile),
      job: {
        title: match.job.title,
        company: match.job.company,
        location: match.job.location,
        remote: match.job.remote,
      },
      confirmed: local.resumeNotes.confirmed,
      unconfirmed: local.resumeNotes.unconfirmed,
      localAnswers: local.answers,
    }),
  )
  if (!json) return local
  const answers = Array.isArray(json.answers) && json.answers.length
    ? json.answers.map((a, i) => ({
        question: str(a.question) || local.answers[i]?.question || `Question ${i + 1}`,
        answer: str(a.answer) || local.answers[i]?.answer || '',
      }))
    : local.answers
  return {
    tailoredResume: str(json.tailoredResume) || local.tailoredResume,
    coverLetter: str(json.coverLetter) || local.coverLetter,
    recruiterMessage: str(json.recruiterMessage) || local.recruiterMessage,
    answers,
    resumeNotes: local.resumeNotes,
    aiLane: 'terra',
  }
}

export async function coachInterview(
  match: JobMatch,
  profile: CandidateProfile,
  localQuestions: string[],
): Promise<{ questions: string[]; coaching: string[]; aiLane?: 'sol' }> {
  if (!openaiReady()) return { questions: localQuestions, coaching: [] }
  const json = await completeJson<{ questions?: string[]; coaching?: string[] }>(
    'interview_coach',
    'Coach a candidate for this interview. JSON: { "questions": string[], "coaching": string[] }. Questions should probe real experience. Do not invent projects.',
    JSON.stringify({
      profile: profileSnapshot(profile),
      job: { title: match.job.title, company: match.job.company, skills: match.job.skills },
      matched: match.matchedSkills,
      missing: match.missingSkills,
    }),
  )
  const questions = strs(json?.questions)
  const coaching = strs(json?.coaching)
  return {
    questions: questions.length ? questions : localQuestions,
    coaching,
    aiLane: json ? 'sol' : undefined,
  }
}

export async function strategizeCareer(
  local: CareerInsights,
  profile: CandidateProfile,
  applications: { status: string; title: string }[],
): Promise<CareerInsights> {
  if (!openaiReady()) return local
  const json = await completeJson<{ headline?: string; advice?: string[]; strategy?: string }>(
    'career_strategy',
    'Give a concise career strategy. Use the profile, scored matches, and any applications. JSON: { "headline", "advice": string[], "strategy" }. Be specific. Do not invent interviews, offers, or skills the candidate did not list.',
    JSON.stringify({
      profile: profileSnapshot(profile),
      applications,
      local,
    }),
  )
  if (!json) return local
  return {
    ...local,
    headline: str(json.headline) || local.headline,
    advice: strs(json.advice).length ? strs(json.advice) : local.advice,
    strategy: str(json.strategy) || local.strategy,
    aiLane: 'sol',
  }
}
