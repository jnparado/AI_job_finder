import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, Upload } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api, apiUpload } from '@/lib/api'
import { useApplyToJob } from '@/lib/useApplyToJob'
import { listOwnResumes, resumeMime, saveResumeToSupabase } from '@/lib/resumeStorage'
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

interface UploadResult {
  parsed: ParsedResume
  text?: string
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

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isPdf(name: string, type = '') {
  return name.toLowerCase().endsWith('.pdf') || /pdf/i.test(type)
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
  const previewRef = useRef<string | null>(null)
  const [phase, setPhase] = useState<Phase>(profile.resumeText ? 'done' : 'idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [fileMeta, setFileMeta] = useState<{ size?: number; type?: string }>({})
  const [previewUrl, setPreviewUrl] = useState('')
  const [parsed, setParsed] = useState<ParsedResume | null>(profile.parsedProfile ?? null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState<SearchResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [paste, setPaste] = useState(profile.resumeText)
  const [view, setView] = useState<'file' | 'text'>('file')

  const apply = useApplyToJob()
  const recommended = (search?.matches ?? []).filter((m) => m.score >= 70).slice(0, 5)
  const busy = phase === 'uploading' || phase === 'parsing' || phase === 'searching'
  const hasResume = Boolean(fileName || paste.trim() || profile.resumeText)
  const shownText = paste.trim() || profile.resumeText
  const shownName = fileName || 'Resume on file'
  const pdfOpen = Boolean(previewUrl && isPdf(fileName, fileMeta.type))

  useEffect(() => {
    if (!user?.id) return
    void listOwnResumes(user.id).then((rows) => {
      const latest = rows[0]
      if (latest?.file_name && !fileName) setFileName(latest.file_name)
    })
  }, [user?.id])

  useEffect(() => {
    if (profile.parsedProfile && !parsed) setParsed(profile.parsedProfile)
  }, [profile.parsedProfile, parsed])

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  function setPreview(file: File) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    if (isPdf(file.name, file.type)) {
      const url = URL.createObjectURL(file)
      previewRef.current = url
      setPreviewUrl(url)
      setView('file')
      return
    }
    setPreviewUrl('')
    setView('text')
    if (file.name.toLowerCase().endsWith('.txt') || /text\/plain/i.test(file.type)) {
      void file.text().then((text) => {
        if (text.trim()) setPaste(text)
      })
    }
  }

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

  async function sendAsJson(file: File, onPct: (n: number) => void) {
    onPct(18)
    const contentBase64 = await fileToBase64(file)
    onPct(55)
    return api<UploadResult>('/api/resume/upload', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: resumeMime(file),
        contentBase64,
      }),
    })
  }

  async function sendAsForm(file: File, onPct: (n: number) => void) {
    const form = new FormData()
    form.append('file', file)
    return apiUpload<UploadResult>('/api/resume/upload', form, onPct)
  }

  async function sendFile(file: File, onPct: (n: number) => void) {
    if (user?.id) {
      try {
        const stored = await saveResumeToSupabase(file, user.id, onPct)
        return await api<UploadResult>('/api/resume/from-storage', {
          method: 'POST',
          body: JSON.stringify({
            path: stored.path,
            fileName: file.name,
            mimeType: stored.mime,
          }),
        })
      } catch {
        // Fall through to a direct API upload if storage is missing or blocked.
      }
    }
    if (file.size <= 3.2 * 1024 * 1024) {
      try {
        return await sendAsJson(file, onPct)
      } catch {
        return sendAsForm(file, onPct)
      }
    }
    return sendAsForm(file, onPct)
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
    setFileMeta({ size: file.size, type: resumeMime(file) })
    setPreview(file)
    setPhase('uploading')
    setProgress(4)
    setError('')
    setSearch(null)
    try {
      const res = await sendFile(file, (pct) => {
        setProgress(Math.max(4, Math.round(pct * 0.62)))
      })
      setParsed(res.parsed)
      if (res.text) setPaste(res.text)
      setPhase('parsing')
      setProgress(70)
      const next = await refreshProfile()
      if (next.resumeText) setPaste(next.resumeText)
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
    setPhase('parsing')
    setProgress(20)
    setError('')
    setSearch(null)
    try {
      const res = await api<UploadResult>('/api/resume/parse-text', {
        method: 'POST',
        body: JSON.stringify({ text: paste }),
      })
      setProgress(55)
      setParsed(res.parsed)
      if (res.text) setPaste(res.text)
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
      setFileName(fileName || 'Pasted resume')
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

  const status =
    phase === 'uploading'
      ? `Uploading ${fileName || 'your resume'}…`
      : phase === 'parsing'
        ? 'Reading your resume and updating your profile…'
        : phase === 'searching'
          ? 'Searching authorized boards and scoring roles against this resume…'
          : hasResume
            ? `${shownName} is on file. ${parsed?.skills.length ? `${parsed.skills.length} skills read.` : 'Upload a new file to replace it.'}`
            : 'Upload a resume to fill your profile. The file stays on this page after it lands.'

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Documents"
        title="Resume"
        description="Upload a PDF, DOCX, or TXT. The file stays visible here, we read the text, then we score live roles against you."
      />

      <Card className="rounded-3xl">
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

      {hasResume ? (
        <Card className="space-y-4 rounded-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#eef3f0] text-[var(--forest)]">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Your resume
                </p>
                <h2 className="mt-1 truncate text-xl">{shownName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[
                    fileMeta.size ? prettySize(fileMeta.size) : null,
                    fileMeta.type?.includes('pdf') || shownName.toLowerCase().endsWith('.pdf')
                      ? 'PDF'
                      : shownName.toLowerCase().endsWith('.docx')
                        ? 'DOCX'
                        : shownText
                          ? `${shownText.length.toLocaleString()} characters`
                          : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pdfOpen && shownText ? (
                <Button variant="outline" className="rounded-full" onClick={() => setView(view === 'file' ? 'text' : 'file')}>
                  {view === 'file' ? 'Show text' : 'Show file'}
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="rounded-full"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                Replace file
              </Button>
            </div>
          </div>

          {view === 'file' && pdfOpen ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-[#eef3f0]">
              <iframe title={shownName} src={previewUrl} className="h-[36rem] w-full bg-white" />
            </div>
          ) : shownText ? (
            <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-[var(--paper)] p-4 font-sans text-sm leading-relaxed text-[var(--forest)]">
              {shownText}
            </pre>
          ) : (
            <p className="rounded-2xl bg-[#eef3f0] px-4 py-6 text-sm text-muted-foreground">
              The file is on this page. Text will appear here as soon as we finish reading it.
            </p>
          )}
        </Card>
      ) : null}

      <Card className="space-y-3 rounded-3xl">
        <h2>{hasResume ? 'Upload a new file' : 'Upload a file'}</h2>
        <p className="text-sm text-muted-foreground">
          PDF, DOCX, or TXT, up to 8 MB. After it uploads, the resume stays on this page so you can read it.
        </p>
        <div
          className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-center text-sm ${
            dragOver ? 'border-[var(--copper)] bg-muted/60' : 'border-border bg-[#f7faf8]'
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
          <Upload className="size-6 text-[var(--forest)]" />
          <span className="mt-3 font-medium">
            {busy
              ? phase === 'searching'
                ? 'Finding jobs…'
                : phase === 'parsing'
                  ? 'Reading resume…'
                  : `Uploading ${fileName || 'file'}…`
              : 'Drop your resume here'}
          </span>
          <span className="mt-1 text-muted-foreground">{fileName && !busy ? fileName : 'or choose a PDF, DOCX, or TXT'}</span>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-full"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
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
        </div>
        {error ? <p className="text-[var(--copper)]">{error}</p> : null}
      </Card>

      <Card className="space-y-3 rounded-3xl">
        <h2>Or paste text</h2>
        <Textarea
          className="min-h-48 rounded-2xl"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste the resume here if you would rather not upload a file."
        />
        <Button variant="outline" className="rounded-full" disabled={busy || !paste.trim()} onClick={() => void parsePasted()}>
          {busy ? 'Working…' : 'Parse and find jobs'}
        </Button>
      </Card>

      {parsed ? (
        <Card className="space-y-3 rounded-3xl">
          <h2>What we read from your resume</h2>
          <p className="text-sm text-muted-foreground">Edit anything that looks wrong, then search again.</p>
          <label className="block text-sm">
            Name
            <input
              className="mt-1 h-10 w-full rounded-lg border border-input px-3"
              value={parsed.name}
              onChange={(e) => setParsed({ ...parsed, name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Headline
            <input
              className="mt-1 h-10 w-full rounded-lg border border-input px-3"
              value={parsed.headline}
              onChange={(e) => setParsed({ ...parsed, headline: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Years
            <input
              type="number"
              className="mt-1 h-10 w-full rounded-lg border border-input px-3"
              value={parsed.experience_years}
              onChange={(e) => setParsed({ ...parsed, experience_years: Number(e.target.value) })}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {parsed.skills.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {parsed.ai_skills.map((s) => (
              <Badge key={s} tone="copper">
                {s}
              </Badge>
            ))}
          </div>
          <Button variant="copper" className="rounded-full" disabled={busy} onClick={() => void acceptAndSearch()}>
            {busy ? 'Searching platforms…' : 'Search jobs that fit this profile'}
          </Button>
        </Card>
      ) : null}

      {search ? (
        <Card className="space-y-4 rounded-3xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2>Jobs that fit you</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {search.discovered} listings pulled, {search.normalized} after duplicates. Excellent{' '}
                {search.counts.excellent ?? 0} · Strong {search.counts.strong ?? 0} · Good {search.counts.good ?? 0}.
              </p>
            </div>
            <Button variant="copper" className="rounded-full" asChild>
              <Link to="/app/jobs">See all matches</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Prepare a packet here, then apply on the official listing. Atelier never submits for you on LinkedIn,
            Indeed, Upwork, or similar boards.
          </p>
          {apply.error ? <p className="text-[var(--copper)]">{apply.error}</p> : null}
          {recommended.length ? (
            <div className="space-y-3">
              {recommended.map((m) => (
                <MatchCard
                  key={m.job.id}
                  match={m}
                  applying={apply.applying && apply.applyingId === m.job.id}
                  onApply={() => apply.applyToJob(m.job.id)}
                />
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
