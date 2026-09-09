import { parseResumeText } from '../shared/engine/resumeParser'
import type { ParsedResume } from '../shared/types'
import { extractResume } from './agents'

export async function extractFileText(
  buffer: Buffer,
  mime: string,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase()
  try {
    if (mime.includes('pdf') || lower.endsWith('.pdf')) {
      const { extractText } = await import('unpdf')
      const { text } = await extractText(new Uint8Array(buffer))
      return Array.isArray(text) ? text.join('\n') : String(text ?? '')
    }
    if (
      mime.includes('word') ||
      lower.endsWith('.docx') ||
      mime.includes('officedocument')
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }
    return buffer.toString('utf8')
  } catch {
    throw new Error('Could not read that resume. Use a PDF, DOCX, or TXT file, or paste the text.')
  }
}

export async function parseResumeSmart(text: string): Promise<ParsedResume> {
  const local = parseResumeText(text)
  return extractResume(text, local)
}
