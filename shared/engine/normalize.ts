import { extractSkills } from '../skills'
import type { Job } from '../types'

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\bsr\.?\b/gi, 'Senior')
    .replace(/\bfull-stack\b/gi, 'Full Stack')
    .replace(/\bfront-end\b/gi, 'Frontend')
    .replace(/\s*[-–—]\s*/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function canonicalKey(job: Pick<Job, 'company' | 'title'>): string {
  const title = slug(cleanTitle(job.title))
    .replace(/\b(the|a|an|ii|iii|developer|engineer)\b/g, 'engineer')
    .replace(/\s+/g, ' ')
    .trim()
  return `${slug(job.company)}::${title}`
}

function similarKeys(a: string, b: string): boolean {
  const [ac, at] = a.split('::')
  const [bc, bt] = b.split('::')
  if (ac !== bc) return false
  const aWords = new Set(at.split(' ').filter(Boolean))
  const bWords = new Set(bt.split(' ').filter(Boolean))
  let overlap = 0
  for (const w of aWords) if (bWords.has(w)) overlap += 1
  return overlap / Math.max(aWords.size, bWords.size, 1) >= 0.5
}

export function normalizeAndDedupe(raw: Job[]): {
  jobs: Job[]
  duplicatesRemoved: number
} {
  const prepared = raw.map((job) => {
    const skills = [...new Set([...job.skills, ...extractSkills(`${job.title} ${job.description}`)])]
    return {
      ...job,
      title: cleanTitle(job.title),
      skills,
      canonicalKey: canonicalKey(job),
      location: job.location?.replace(/\s+/g, ' ').trim(),
      sources: job.sources ?? [{ source: job.source, url: job.applicationUrl }],
    }
  })

  const kept: Job[] = []
  let duplicatesRemoved = 0
  for (const job of prepared) {
    const existing = kept.find(
      (k) => k.canonicalKey && job.canonicalKey && similarKeys(k.canonicalKey, job.canonicalKey),
    )
    if (!existing) {
      kept.push(job)
      continue
    }
    duplicatesRemoved += 1
    existing.sources = [
      ...(existing.sources ?? []),
      { source: job.source, url: job.applicationUrl },
    ]
    if ((job.description?.length ?? 0) > (existing.description?.length ?? 0)) {
      existing.description = job.description
    }
    if ((job.skills.length) > existing.skills.length) existing.skills = job.skills
    if ((job.salaryMax ?? 0) > (existing.salaryMax ?? 0)) {
      existing.salaryMin = job.salaryMin
      existing.salaryMax = job.salaryMax
    }
  }
  return { jobs: kept, duplicatesRemoved }
}
