import { extractSkills, splitAiSkills } from '../skills'
import type { ParsedResume } from '../types'

const INDUSTRY_RE = [
  { name: 'SaaS', re: /\bsaas\b|software as a service/i },
  { name: 'AI', re: /\bai\b|machine learning|llm|openai/i },
  { name: 'E-commerce', re: /\be-?commerce\b|shopify|checkout/i },
  { name: 'Fintech', re: /\bfintech\b|payments|banking/i },
  { name: 'Healthcare', re: /\bhealth(care)?\b/i },
]

export function parseResumeText(text: string): ParsedResume {
  const skillsAll = extractSkills(text)
  const { core, ai } = splitAiSkills(skillsAll)
  const years =
    Number(text.match(/(\d+)\+?\s+years?/i)?.[1] ?? 0) ||
    inferYearsFromRanges(text)
  const nameLine = text.split('\n').map((l) => l.trim()).find(Boolean) ?? 'Candidate'
  const headline =
    text.match(
      /(full stack|frontend|front-end|backend|software|product)[^\n,]{0,40}/i,
    )?.[0]?.trim() ?? 'Software Engineer'
  const industries = INDUSTRY_RE.filter((i) => i.re.test(text)).map((i) => i.name)

  return {
    name: nameLine.replace(/[^A-Za-z .'-]/g, '').slice(0, 80) || 'Candidate',
    headline,
    experience_years: years,
    skills: core,
    ai_skills: ai,
    industries: industries.length ? industries : ['SaaS'],
    summary: `${headline} with ${years || 'several'} years across ${core.slice(0, 5).join(', ') || 'software'}.`,
  }
}

function inferYearsFromRanges(text: string): number {
  const ranges = [...text.matchAll(/\b(20\d{2})\s*[–—-]\s*(20\d{2}|present)\b/gi)]
  if (!ranges.length) return 0
  let min = 9999
  let max = 0
  for (const m of ranges) {
    min = Math.min(min, Number(m[1]))
    max = Math.max(max, /present/i.test(m[2]) ? 2026 : Number(m[2]))
  }
  return Math.max(0, max - min)
}
