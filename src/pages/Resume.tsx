import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, Upload } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api, apiUpload } from '@/lib/api'
import { useApplyToJob } from '@/lib/useApplyToJob'
import { listOwnResumes, resumeMime, saveResumeToSupabase } from '@/lib/resumeStorage'
import { Button } from '@/components/ui/button'
import { Badge, Textarea } from '@/components/ui/card'
import { MatchCard } from '@/components/jobs/MatchCard'
import type { DiscoverySummary, JobMatch, ParsedResume } from '@shared/types'
import {
  ResumeAiPanel,
  ResumeAiTips,
  ResumeDeskHeader,
  ResumePreviewBanner,
  ResumeProfileCard,
  ResumeSectionList,
  ResumeStrengthPanel,
  ResumeTabs,
  ResumeTemplatesPanel,
  buildResumeChecks,
  resumeStrengthPercent,
  type ResumeTab,
} from '@/components/candidate/ResumeDesk'

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
const TEMPLATE_KEY = 'atelier-resume-template'

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
      <div className="h-2 overflow-hidden rounded-full bg-[#eef2f0]">
        <div className="h-full rounded-full bg-[#2f9a6f] transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ResumePage() {
  const { user, profile, saveProfile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)
  const [tab, setTab] = useState<ResumeTab>('edit')
  const [template, setTemplate] = useState(() => {
    try {
      return localStorage.getItem(TEMPLATE_KEY) || 'modern'
    } catch {
      return 'modern'
    }
  })
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
  const checks = buildResumeChecks(profile, parsed)
  const strength = resumeStrengthPercent(checks)

  useEffect(() => {
    if (!user?.id) return
    void listOwnResumes(user.id).then((rows) => {
      const latest = rows[0]
      if (latest?.file_name && !fileName) setFileName(latest.file_name)
    })
  }, [user?.id, fileName])

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

  function pickTemplate(id: string) {
    setTemplate(id)
    try {
      localStorage.setItem(TEMPLATE_KEY, id)
    } catch {
      /* ignore */
    }
  }

  function downloadResume() {
    if (previewUrl && pdfOpen) {
      const a = document.createElement('a')
      a.href = previewUrl
      a.download = fileName || 'resume.pdf'
      a.click()
      return
    }
    if (shownText) {
      const blob = new Blob([shownText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (fileName.replace(/\.[^.]+$/, '') || 'resume') + '.txt'
      a.click()
      URL.revokeObjectURL(url)
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
        /* fall through */
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
    setTab('ai')
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

  const uploadZone = (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-center text-sm ${
        dragOver ? 'border-[#2f9a6f] bg-[#e7f6ef]/40' : 'border-[#e7ebe9] bg-[#f7faf8]'
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
      <Upload className="size-6 text-[#2f9a6f]" />
      <span className="mt-3 font-medium text-[#002018]">
        {busy
          ? phase === 'searching'
            ? 'Finding jobs…'
            : phase === 'parsing'
              ? 'Reading resume…'
              : `Uploading ${fileName || 'file'}…`
          : 'Drop your resume here'}
      </span>
      <span className="mt-1 text-muted-foreground">PDF, DOCX, or TXT — up to 8 MB</span>
      <Button
        type="button"
        variant="outline"
        className="mt-4 rounded-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        Browse files
      </Button>
    </div>
  )

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 pb-8 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_17.5rem] xl:items-start xl:pb-6">
      <div className="min-w-0 space-y-4 sm:space-y-5">
        <ResumeDeskHeader onDownload={downloadResume} canDownload={Boolean(pdfOpen || shownText)} />
        <ResumeTabs tab={tab} onTab={setTab} />

        {tab === 'edit' ? (
          <div className="space-y-4">
            <div className="xl:hidden">
              <ResumeStrengthPanel checks={checks} strength={strength} />
            </div>
            <ResumeProfileCard profile={profile} />
            <ResumeSectionList profile={profile} parsed={parsed} checks={checks} />
            <ResumePreviewBanner onPreview={() => setTab('preview')} />
            <ResumeAiTips />
            <div className="space-y-4 xl:hidden">
              <ResumeAiPanel onImprove={() => setTab('ai')} />
              <ResumeTemplatesPanel
                selected={template}
                onSelect={pickTemplate}
                compact
                onSeeAll={() => setTab('templates')}
              />
            </div>
          </div>
        ) : null}

        {tab === 'preview' ? (
          <div className="space-y-4">
            {hasResume ? (
              <section className="rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)] sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {shownName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Template: {template.charAt(0).toUpperCase() + template.slice(1)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pdfOpen && shownText ? (
                      <Button variant="outline" className="rounded-full" onClick={() => setView(view === 'file' ? 'text' : 'file')}>
                        {view === 'file' ? 'Show text' : 'Show file'}
                      </Button>
                    ) : null}
                    <Button variant="outline" className="rounded-full" disabled={busy} onClick={() => inputRef.current?.click()}>
                      Replace file
                    </Button>
                  </div>
                </div>
                {view === 'file' && pdfOpen ? (
                  <div className="overflow-hidden rounded-2xl border border-[#e7ebe9] bg-[#eef3f0]">
                    <iframe title={shownName} src={previewUrl} className="h-[28rem] w-full bg-white sm:h-[40rem]" />
                  </div>
                ) : shownText ? (
                  <pre className="max-h-[40rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-[#e7ebe9] bg-[#f7faf8] p-4 font-sans text-sm leading-relaxed text-[#002018]">
                    {shownText}
                  </pre>
                ) : (
                  <p className="rounded-2xl bg-[#eef3f0] px-4 py-6 text-sm text-muted-foreground">
                    The file is on file. Text will appear here once parsing finishes.
                  </p>
                )}
              </section>
            ) : (
              <section className="rounded-2xl border border-[#e7ebe9] bg-white p-6 text-center shadow-[0_8px_20px_rgba(19,38,31,0.04)]">
                <FileText className="mx-auto size-10 text-[#2f9a6f]" />
                <p className="mt-3 font-serif text-xl text-[#002018]">No resume uploaded yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Upload a PDF, DOCX, or TXT file to preview it here.
                </p>
                <Button className="mt-4 rounded-full bg-[#002018] !text-white" onClick={() => setTab('ai')}>
                  Upload resume
                </Button>
              </section>
            )}
          </div>
        ) : null}

        {tab === 'templates' ? (
          <ResumeTemplatesPanel selected={template} onSelect={pickTemplate} />
        ) : null}

        {tab === 'ai' ? (
          <div className="space-y-4">
            {busy ? (
              <section className="rounded-2xl border border-[#e7ebe9] bg-white p-4 sm:p-5">
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
              </section>
            ) : null}

            <section className="rounded-2xl border border-[#e7ebe9] bg-white p-4 sm:p-5">
              <h2 className="font-medium text-[#002018]">{hasResume ? 'Upload a new file' : 'Upload your resume'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We read the text, update your profile, then score live roles against you.
              </p>
              <div className="mt-4">{uploadZone}</div>
              {error ? <p className="mt-3 text-sm text-[#c47b12]">{error}</p> : null}
            </section>

            <section className="rounded-2xl border border-[#e7ebe9] bg-white p-4 sm:p-5">
              <h2 className="font-medium text-[#002018]">Or paste text</h2>
              <Textarea
                className="mt-3 min-h-40 rounded-2xl"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste your resume here if you would rather not upload a file."
              />
              <Button
                variant="outline"
                className="mt-3 rounded-full"
                disabled={busy || !paste.trim()}
                onClick={() => void parsePasted()}
              >
                {busy ? 'Working…' : 'Parse and find jobs'}
              </Button>
            </section>

            {parsed ? (
              <section className="rounded-2xl border border-[#e7ebe9] bg-white p-4 sm:p-5">
                <h2 className="font-medium text-[#002018]">What we read from your resume</h2>
                <p className="mt-1 text-sm text-muted-foreground">Edit anything that looks wrong, then search again.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    Name
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#e7ebe9] px-3"
                      value={parsed.name}
                      onChange={(e) => setParsed({ ...parsed, name: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    Headline
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#e7ebe9] px-3"
                      value={parsed.headline}
                      onChange={(e) => setParsed({ ...parsed, headline: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    Years
                    <input
                      type="number"
                      className="mt-1 h-10 w-full rounded-lg border border-[#e7ebe9] px-3"
                      value={parsed.experience_years}
                      onChange={(e) => setParsed({ ...parsed, experience_years: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {parsed.skills.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
                <Button
                  className="mt-4 rounded-full bg-[#002018] !text-white"
                  disabled={busy}
                  onClick={() => void acceptAndSearch()}
                >
                  {busy ? 'Searching platforms…' : 'Search jobs that fit this profile'}
                </Button>
              </section>
            ) : null}

            {search ? (
              <section className="rounded-2xl border border-[#e7ebe9] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-medium text-[#002018]">Jobs that fit you</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search.discovered} listings pulled, {search.normalized} after duplicates.
                    </p>
                  </div>
                  <Button variant="outline" className="rounded-full" asChild>
                    <Link to="/app/jobs" replace>
                      See all matches
                    </Link>
                  </Button>
                </div>
                {recommended.length ? (
                  <div className="mt-4 space-y-3">
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
                  <p className="mt-4 text-sm text-muted-foreground">
                    Nothing cleared 70% yet. Open all scored jobs and tighten your title or skills.
                  </p>
                )}
              </section>
            ) : null}
          </div>
        ) : null}

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

      <aside className="hidden min-w-0 space-y-4 xl:sticky xl:top-24 xl:block">
        <ResumeStrengthPanel checks={checks} strength={strength} />
        <ResumeAiPanel onImprove={() => setTab('ai')} />
        <ResumeTemplatesPanel
          selected={template}
          onSelect={pickTemplate}
          compact
          onSeeAll={() => setTab('templates')}
        />
      </aside>
    </div>
  )
}
