import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, Badge, Textarea } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/feedback'
import { MatchCard } from '@/components/jobs/MatchCard'
import type { DiscoverySummary, JobMatch, ParsedResume } from '@shared/types'

interface SearchResult {
  discovered: number
  normalized: number
  counts: Record<string, number>
  matches: JobMatch[]
  discovery?: DiscoverySummary
}

type Phase = 'idle' | 'parsing' | 'searching' | 'done'

export function ResumePage() {
  const { profile, saveProfile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const [phase, setPhase] = useState<Phase>('idle')
  const [parsed, setParsed] = useState<ParsedResume | null>(profile.parsedProfile ?? null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState<SearchResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [paste, setPaste] = useState(profile.resumeText)

  const recommended = (search?.matches ?? []).filter((m) => m.score >= 70).slice(0, 5)

  async function runSearch() {
    setPhase('searching')
    const result = await api<SearchResult>('/api/agent/search', { method: 'POST', body: '{}' })
    setSearch(result)
    await qc.invalidateQueries({ queryKey: ['jobs'] })
    await qc.invalidateQueries({ queryKey: ['discovery'] })
    setPhase('done')
    return result
  }

  async function onFile(file: File) {
    setPhase('parsing')
    setError('')
    setSearch(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api<{ parsed: ParsedResume }>('/api/resume/upload', { method: 'POST', body: form })
      setParsed(res.parsed)
      await refreshProfile()
      await runSearch()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setPhase('idle')
    }
  }

  async function parsePasted() {
    setPhase('parsing')
    setError('')
    setSearch(null)
    try {
      const res = await api<{ parsed: ParsedResume }>('/api/resume/parse-text', {
        method: 'POST',
        body: JSON.stringify({ text: paste }),
      })
      setParsed(res.parsed)
      await saveProfile({
        resumeText: paste,
        parsedProfile: res.parsed,
        headline: res.parsed.headline || profile.headline,
        currentTitle: profile.currentTitle || res.parsed.headline,
        desiredTitle: profile.desiredTitle || res.parsed.headline,
        yearsExperience: res.parsed.experience_years || profile.yearsExperience,
        skills: [...new Set([...profile.skills, ...res.parsed.skills])],
        aiSkills: [...new Set([...profile.aiSkills, ...res.parsed.ai_skills])],
        industry: profile.industry || res.parsed.industries[0] || '',
      })
      await runSearch()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse failed')
      setPhase('idle')
    }
  }

  async function acceptAndSearch() {
    if (!parsed) return
    setError('')
    try {
      await saveProfile({
        parsedProfile: parsed,
        headline: parsed.headline,
        currentTitle: profile.currentTitle || parsed.headline,
        desiredTitle: profile.desiredTitle || parsed.headline,
        yearsExperience: parsed.experience_years || profile.yearsExperience,
        skills: [...new Set([...profile.skills, ...parsed.skills])],
        aiSkills: [...new Set([...profile.aiSkills, ...parsed.ai_skills])],
        industry: profile.industry || parsed.industries[0] || '',
      })
      await runSearch()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
      setPhase('idle')
    }
  }

  const busy = phase === 'parsing' || phase === 'searching'
  const status =
    phase === 'parsing'
      ? 'Reading your resume and updating your profile…'
      : phase === 'searching'
        ? 'Searching Remotive, Remote OK, career pages, and other authorized boards…'
        : phase === 'done'
          ? `Found ${search?.normalized ?? 0} roles. ${recommended.length} currently clear a 70% fit.`
          : 'Upload a resume to fill your profile, then the agent searches platforms that fit you.'

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Documents"
        title="Resume"
        description="Upload or paste a resume. The agent extracts your skills, then searches live job boards and scores every role against you."
      />

      <Card>
        <p className="text-sm leading-relaxed">{status}</p>
      </Card>

      <Card className="space-y-3">
        <h2>Upload a file</h2>
        <p className="text-sm text-muted-foreground">PDF, DOCX, or TXT. Parsing runs on the server, then matching starts automatically.</p>
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-sm ${dragOver ? 'border-[var(--copper)] bg-muted/60' : 'border-border bg-background hover:border-primary'}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) void onFile(f)
          }}
        >
          <span className="font-medium">{busy ? (phase === 'searching' ? 'Finding jobs…' : 'Processing…') : 'Choose a resume file'}</span>
          <span className="mt-1 text-muted-foreground">or drop it on this box</span>
          <input
            className="sr-only"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf"
            disabled={busy}
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
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <Button variant="outline" disabled={busy || !paste.trim()} onClick={() => void parsePasted()}>
          {busy ? 'Working…' : 'Parse and find jobs'}
        </Button>
      </Card>
      {parsed ? (
        <Card className="space-y-3">
          <h2>What we read from your resume</h2>
          <p className="text-sm text-muted-foreground">Edit anything that looks wrong, then search again.</p>
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
          <Button variant="copper" disabled={busy} onClick={() => void acceptAndSearch()}>
            {busy ? 'Searching platforms…' : 'Search jobs that fit this profile'}
          </Button>
        </Card>
      ) : null}

      {phase === 'done' && search ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2>Jobs that fit you</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {search.discovered} listings pulled, {search.normalized} after duplicates.
                Excellent {search.counts.excellent ?? 0} · Strong {search.counts.strong ?? 0} · Good {search.counts.good ?? 0}.
              </p>
            </div>
            <Button variant="copper" asChild>
              <Link to="/app/jobs">See all matches</Link>
            </Button>
          </div>
          {search.discovery?.officialSearch?.length ? (
            <p className="text-sm text-muted-foreground">
              LinkedIn, Indeed, and Upwork open on their official sites from the Jobs page.
            </p>
          ) : null}
          {recommended.length ? (
            <div className="space-y-3">
              {recommended.map((m) => (
                <MatchCard key={m.job.id} match={m} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing cleared 70% yet. Open all scored jobs and tighten your title or skills.
            </p>
          )}
        </Card>
      ) : null}
    </div>
  )
}
