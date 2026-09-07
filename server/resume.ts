import mammoth from 'mammoth'
import { extractText } from 'unpdf'
import { parseResumeText } from '../shared/engine/resumeParser'
import type { ParsedResume } from '../shared/types'

export async function extractFileText(
  buffer: Buffer,
  mime: string,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase()
  if (mime.includes('pdf') || lower.endsWith('.pdf')) {
    const { text } = await extractText(new Uint8Array(buffer))
    return Array.isArray(text) ? text.join('\n') : String(text ?? '')
  }
  if (
    mime.includes('word') ||
    lower.endsWith('.docx') ||
    mime.includes('officedocument')
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  return buffer.toString('utf8')
}

export async function parseResumeSmart(text: string): Promise<ParsedResume> {
  const local = parseResumeText(text)
  const key = process.env.OPENAI_API_KEY
  if (!key) return local
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: key })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Extract a candidate profile as JSON with keys: name, headline, experience_years, skills (string[]), ai_skills (string[]), industries (string[]), summary. Do not invent employers or skills that are not in the resume.',
        },
        { role: 'user', content: text.slice(0, 12000) },
      ],
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) return local
    const parsed = JSON.parse(raw) as ParsedResume
    return {
      name: parsed.name || local.name,
      headline: parsed.headline || local.headline,
      experience_years: Number(parsed.experience_years) || local.experience_years,
      skills: parsed.skills?.length ? parsed.skills : local.skills,
      ai_skills: parsed.ai_skills?.length ? parsed.ai_skills : local.ai_skills,
      industries: parsed.industries?.length ? parsed.industries : local.industries,
      summary: parsed.summary || local.summary,
    }
  } catch {
    return local
  }
}
