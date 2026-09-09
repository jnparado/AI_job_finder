import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { api, apiUpload, authHeader } from '@/lib/api'
import { supabase } from '@/lib/supabase'
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

type Phase = 'idle' | 'uploading' | 'parsing' | 'searching' | 'done'

const MAX_BYTES = 8 * 1024 * 1024
const ACCEPT =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

function fileLooksLikeResume(file: File) {
  const name = file.name.toLowerCase()
  return (
    name.endsWith('.pdf') ||
    name.endsWith('.docx') ||
    name.endsWith('.txt') ||
    /pdf|wordprocessingml|msword|text\/plain/i.test(file.type)
  )
}

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'resume'
}

function UploadProgress({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--forest)] transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function ResumePage() {
  const { user, profile, saveProfile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedResume | null>(profile.parsedProfile ?? null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState<SearchResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [paste, setPaste] = useState(profile.resumeText)

  const recommended = (search?.matches ?? []).filter((m) => m.score >= 70).slice(0, 5)
  const busy = phase === 'uploading' || phase === 'parsing' || phase === 'searching'
  const status =
    phase === 'uploading'
      ? `Uploading ${fileName || 'your resume'}…`
      : phase === 'parsing'
        ? 'Reading your resume and updating your profile…'
        : phase === 'searching'
          ? 'Searching Remotive, Remote OK, career pages, and other authorized boards…'
          : phase === 'done'
            ? `Found ${search?.normalized ?? 0} roles. ${recommended.length} currently clear a 70% fit.`
            : 'Upload a resume to fill your profile, then the agent searches platforms that fit you.'

  async function runSearch() {
    setPhase('searching')
    setProgress((n) => Math.max(n, 78))
    const result = await api<SearchResult>('/api/agent/search', { method: 'POST', body: '{}' })
    setSearch(result)
    await qc.invalidateQueries({ queryKey: ['jobs'] })
    await qc.invalidateQueries({ queryKey: ['discovery'] })
    setProgress(100)
    setPhase('done')
    return result
  }

  async function sendToApi(file: File, onPct: (n: number) => void) {
    const form = new FormData()
    form.append('file', file)
    return apiUpload<{ parsed: ParsedResume }>('/api/resume/upload', form, onPct)
  }

  async function sendViaStorage(file: File, onPct: (n: number) => void) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!supabase || !user?.id || !url || !anon) return sendToApi(file, onPct)
    const auth = await authHeader()
    const token = auth.Authorization?.replace(/^Bearer\s+/i, '')
    if (!token || token === 'demo' || token === 'employer') return sendToApi(file, onPct)

    const objectPath = `${user.id}/${Date.now()}-${safeName(file.name)}`
    const endpoint = `${url.replace(/\/$/, '')}/storage/v1/object/resumes/${objectPath}`

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', endpoint)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.setRequestHeader('apikey', anon)
        xhr.setRequestHeader('x-upsert', 'true')
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.timeout = 120_000
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onPct(Math.round((event.loaded / event.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
            return
          }
          reject(new Error('storage'))
        }
        xhr.onerror = () => reject(new Error('storage'))
        xhr.ontimeout = () => reject(new Error('storage'))
        xhr.send(file)
      })
    } catch {
      return sendToApi(file, onPct)
    }

    return api<{ parsed: ParsedResume }>('/api/resume/from-storage', {
      method: 'POST',
      body: JSON.stringify({
        path: objectPath,
        fileName: file.name,
        mimeType: file.type,
      }),
    })
  }

  async function onFile(file: File) {
    if (!fileLooksLikeResume(file)) {
      setError('Use a PDF, DOCX, or TXT file.')
      return
    }
    if (!file.size) {
      setError('That file is empty.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Keep the file under 8 MB.')
      return
    }

    setFileName(file.name)
    setPhase('uploading')
    setProgress(4)
    setError('')
    setSearch(null)
    try {
      const res = await sendViaStorage(file, (pct) => {
        setProgress(Math.max(4, Math.round(pct * 0.62)))
      })
      setParsed(res.parsed)
      setPhase('parsing')
      setProgress(70)
      await refreshProfile()
      setProgress(76)
      try {
        await runSearch()
      } catch (searchErr) {
        setError(searchErr instanceof Error ? searchErr.message : 'Resume saved, but job search failed.')
        setPhase('done')
        setProgress(100)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setPhase('idle')
      setProgress(0)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function parsePasted() {
    setFileName('')
    setPhase('parsing')
    setProgress(20)
    setError('')
    setSearch(null)
    try {
      const res = await api<{ parsed: ParsedResume }>('/api/resume/parse-text', {
        method: 'POST',
        body: JSON.stringify({ text: paste }),
      })
      setProgress(55)
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
      setProgress(0)
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
      setProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Documents"
        title="Resume"
        description="Upload or paste a resume. The agent extracts your skills, then searches live job boards and scores every role against you."
      />

      <Card>
        <p className="text-sm leading-relaxed">{status}</p>
        {busy ? (
          <div className="mt-4">
            <UploadProgress
              value={progress}
              label={
                phase === 'uploading'
                  ? `Uploading${fileName ? ` ${fileName}` : ''}`
                  : phase === 'parsing'
                    ? 'Reading resume'
                    : 'Finding jobs'
              }
            />
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <h2>Upload a file</h2>
        <p className="text-sm text-muted-foreground">
          PDF, DOCX, or TXT, up to 8 MB. Parsing runs on the server, then matching starts automatically.
        </p>
        <label
          htmlFor="resume-file"
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center text-sm ${
            dragOver ? 'border-[var(--copper)] bg-muted/60' : 'border-border bg-background hover:border-primary'
          } ${busy ? 'pointer-events-none opacity-70' : ''}`}
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
          <span className="font-medium">
            {busy ? (phase === 'searching' ? 'Finding jobs…' : phase === 'parsing' ? 'Reading resume…' : 'Uploading…') : 'Choose a resume file'}
          </span>
          <span className="mt-1 text-muted-foreground">
            {fileName && busy ? fileName : 'or drop it on this box'}
          </span>
          <span className="mt-4 inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium">
            Browse files
          </span>
          <input
            id="resume-file"
            ref={inputRef}
            className="sr-only"
            type="file"
            accept={ACCEPT}
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
