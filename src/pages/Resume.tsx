import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, Badge, Textarea } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/feedback'
import type { ParsedResume } from '@shared/types'

export function ResumePage() {
  const { profile, saveProfile, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [parsed, setParsed] = useState<ParsedResume | null>(profile.parsedProfile ?? null)
  const [error, setError] = useState('')

  async function onFile(file: File) {
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api<{ parsed: ParsedResume }>('/api/resume/upload', { method: 'POST', body: form })
      setParsed(res.parsed)
      await refreshProfile()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function parsePasted() {
    setBusy(true)
    try {
      const res = await api<{ parsed: ParsedResume }>('/api/resume/parse-text', {
        method: 'POST',
        body: JSON.stringify({ text: profile.resumeText }),
      })
      setParsed(res.parsed)
    } finally {
      setBusy(false)
    }
  }

  async function accept() {
    if (!parsed) return
    await saveProfile({
      parsedProfile: parsed,
      headline: parsed.headline,
      currentTitle: profile.currentTitle || parsed.headline,
      yearsExperience: parsed.experience_years || profile.yearsExperience,
      skills: [...new Set([...profile.skills, ...parsed.skills])],
      aiSkills: [...new Set([...profile.aiSkills, ...parsed.ai_skills])],
      industry: profile.industry || parsed.industries[0] || '',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Documents"
        title="Resume"
        description="Upload a PDF, Word file, or paste text. Review the extraction before it becomes your profile."
      />
      <Card className="space-y-3">
        <h2>Upload a file</h2>
        <p className="text-sm text-muted-foreground">PDF, DOCX, or TXT. Parsing runs on the server, not in the browser.</p>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm hover:border-primary">
          <span className="font-medium">{busy ? 'Processing…' : 'Choose a resume file'}</span>
          <span className="mt-1 text-muted-foreground">or drop it on this box</span>
          <input
            className="sr-only"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
            }}
          />
        </label>
        {error ? <p className="text-[var(--copper)]">{error}</p> : null}
      </Card>
      <Card className="space-y-3">
        <h2>Paste text</h2>
        <Textarea
          className="min-h-48"
          value={profile.resumeText}
          onChange={(e) => void saveProfile({ resumeText: e.target.value })}
        />
        <Button variant="outline" onClick={() => void parsePasted()}>Parse pasted resume</Button>
      </Card>
      {parsed ? (
        <Card className="space-y-3">
          <h2>Review AI extraction</h2>
          <p className="text-sm text-muted-foreground">Correct anything the parser got wrong before it becomes your career profile.</p>
          <label className="block text-sm">Name
            <input className="mt-1 h-10 w-full rounded-lg border border-input px-3" value={parsed.name} onChange={(e) => setParsed({ ...parsed, name: e.target.value })} />
          </label>
          <label className="block text-sm">Headline
            <input className="mt-1 h-10 w-full rounded-lg border border-input px-3" value={parsed.headline} onChange={(e) => setParsed({ ...parsed, headline: e.target.value })} />
          </label>
          <label className="block text-sm">Years
            <input type="number" className="mt-1 h-10 w-full rounded-lg border border-input px-3" value={parsed.experience_years} onChange={(e) => setParsed({ ...parsed, experience_years: Number(e.target.value) })} />
          </label>
          <div className="flex flex-wrap gap-2">
            {parsed.skills.map((s) => <Badge key={s}>{s}</Badge>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {parsed.ai_skills.map((s) => <Badge key={s} tone="copper">{s}</Badge>)}
          </div>
          <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(parsed, null, 2)}</pre>
          <Button variant="copper" onClick={() => void accept()}>Use this extraction</Button>
        </Card>
      ) : null}
    </div>
  )
}
