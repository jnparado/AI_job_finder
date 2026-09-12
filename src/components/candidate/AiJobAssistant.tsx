import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  FileText,
  LineChart,
  MessageSquare,
  ScrollText,
  Search,
  Sparkles,
} from 'lucide-react'
import type { CareerInsights, DiscoverySummary, JobMatch } from '@shared/types'
import { api } from '@/lib/api'
import { moneyBand } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Intent = 'match' | 'packet' | 'career' | 'interview' | 'resume'

interface SearchResult {
  discovered: number
  normalized: number
  duplicatesRemoved: number
  counts: {
    excellent: number
    strong: number
    good: number
    possible: number
    poor: number
  }
  matches: JobMatch[]
  discovery: DiscoverySummary
}

interface AssistantProps {
  topMatch?: JobMatch | null
  matchCount: number
  onMatchesUpdated?: () => void
}

const INTENTS: { id: Intent; label: string; hint: string }[] = [
  { id: 'match', label: 'Find matches', hint: 'AI searches boards and scores roles to your resume' },
  { id: 'packet', label: 'Prepare packet', hint: 'Draft a packet for your best match — you approve before send' },
  { id: 'career', label: 'Career advice', hint: 'Coach notes from your real scores and packets' },
  { id: 'interview', label: 'Interview prep', hint: 'Practice questions for your top match' },
  { id: 'resume', label: 'Improve resume', hint: 'Upload or refresh so matching stays honest' },
]

function routeIntent(prompt: string): Intent {
  const q = prompt.toLowerCase()
  if (/interview|rehears|practice|question/.test(q)) return 'interview'
  if (/career|coach|advice|gap|strategy|salary insight/.test(q)) return 'career'
  if (/resume|cv|profile strength|improve profile/.test(q)) return 'resume'
  if (/packet|apply|cover letter|prepare|send to employer/.test(q)) return 'packet'
  return 'match'
}

export function AiJobAssistant({ topMatch, matchCount, onMatchesUpdated }: AssistantProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [intent, setIntent] = useState<Intent>('match')
  const [note, setNote] = useState('')
  const [lastSearch, setLastSearch] = useState<SearchResult | null>(null)
  const [careerSnap, setCareerSnap] = useState<CareerInsights | null>(null)

  const career = useQuery({
    queryKey: ['career'],
    queryFn: () => api<CareerInsights>('/api/career'),
    staleTime: 60_000,
    enabled: false,
  })

  const search = useMutation({
    mutationFn: async (focus: string) => {
      const ctrl = new AbortController()
      const timer = window.setTimeout(() => ctrl.abort(), 25_000)
      try {
        return await api<SearchResult>('/api/agent/search', {
          method: 'POST',
          body: JSON.stringify(focus.trim() ? { query: focus.trim() } : {}),
          signal: ctrl.signal,
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Search timed out. Try again — scored listings may still update.')
        }
        throw err
      } finally {
        window.clearTimeout(timer)
      }
    },
    onSuccess: (res) => {
      setLastSearch(res)
      const strong = (res.counts.excellent || 0) + (res.counts.strong || 0) + (res.counts.good || 0)
      setNote(
        `AI Job Agent searched “${res.discovery.query}” — ${res.discovered} found, ${strong} at 70%+ fit.`,
      )
      qc.setQueryData(['jobs'], res.matches)
      void qc.invalidateQueries({ queryKey: ['candidate-home'] })
      void qc.invalidateQueries({ queryKey: ['discovery'] })
      onMatchesUpdated?.()
    },
    onError: (err) => {
      setNote(err instanceof Error ? err.message : 'Could not run AI search.')
    },
  })

  const apply = useMutation({
    mutationFn: (jobId: string) =>
      api<{ id: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ['candidate-home'] })
      void qc.invalidateQueries({ queryKey: ['applications'] })
      navigate(`/app/applications/${row.id}`)
    },
    onError: (err) => {
      setNote(err instanceof Error ? err.message : 'Could not prepare packet.')
    },
  })

  const busy = search.isPending || apply.isPending || career.isFetching

  async function runCareer() {
    setNote('Loading career coach from your matches and packets…')
    try {
      const data = await career.refetch()
      const d = data.data
      if (d) {
        setCareerSnap(d)
        setNote(d.headline || 'Career coach is ready.')
      } else {
        setNote('Could not load career coach.')
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not load career coach.')
    }
  }

  function runIntent(next: Intent, text = prompt) {
    setIntent(next)
    setCareerSnap(null)
    if (next === 'match') {
      setNote(text.trim() ? `Searching with focus: ${text.trim()}…` : 'AI is planning a search from your profile…')
      void search.mutate(text)
      return
    }
    if (next === 'packet') {
      if (!topMatch) {
        setNote('No scored role yet. Run Find matches first, then prepare a packet.')
        setIntent('match')
        return
      }
      setNote(`Preparing packet for ${topMatch.job.title} (${topMatch.score}% fit)…`)
      void apply.mutate(topMatch.job.id)
      return
    }
    if (next === 'career') {
      void runCareer()
      return
    }
    if (next === 'interview') {
      navigate(topMatch ? `/app/interview?jobId=${encodeURIComponent(topMatch.job.id)}` : '/app/interview')
      return
    }
    navigate('/app/resume')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const chosen = prompt.trim() ? routeIntent(prompt) : intent
    runIntent(chosen, prompt)
  }

  const preview = (lastSearch?.matches ?? []).filter((m) => m.score >= 70).slice(0, 3)

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d7eadc] bg-white shadow-[0_12px_32px_rgba(19,38,31,0.06)]">
      <div className="border-b border-[#eef3f0] bg-gradient-to-r from-[#e8f6ee] via-white to-[#f7f1e4] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#2f9a6f]">
              <Sparkles className="size-3.5" />
              AI Job Assistant
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#002018] sm:text-[1.75rem]">
              Ask Atelier to match, coach, and prepare packets
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Authorized boards only. Packets leave only after you approve — we never silent auto-apply on LinkedIn,
              Indeed, or Upwork.
            </p>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2 text-right text-xs text-muted-foreground ring-1 ring-[#e4ebe6]">
            <p className="font-medium text-[#002018]">{matchCount} scored roles</p>
            <p>{topMatch ? `Best fit ${topMatch.score}%` : 'Run a search to score roles'}</p>
          </div>
        </div>

        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Try “React roles in Manila”, “prepare my best packet”, or “career advice”…'
              className="h-12 w-full rounded-full border border-[#d7eadc] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2f9a6f]"
              disabled={busy}
            />
          </div>
          <Button
            type="submit"
            className="h-12 rounded-full bg-[#002018] px-6 !text-white hover:bg-[#001510]"
            disabled={busy}
          >
            {busy ? 'Working…' : 'Run assistant'}
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {INTENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              disabled={busy}
              onClick={() => runIntent(item.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                intent === item.id
                  ? 'border-[#002018] bg-[#002018] text-white'
                  : 'border-[#e7ebe9] bg-white text-[#002018] hover:border-[#2f9a6f]',
              )}
            >
              {item.id === 'match' ? <Search className="size-3.5" /> : null}
              {item.id === 'packet' ? <FileText className="size-3.5" /> : null}
              {item.id === 'career' ? <LineChart className="size-3.5" /> : null}
              {item.id === 'interview' ? <MessageSquare className="size-3.5" /> : null}
              {item.id === 'resume' ? <ScrollText className="size-3.5" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {note ? (
          <p className="rounded-xl bg-[#eef2f0] px-3 py-2 text-sm text-[#002018]">{note}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick an action or type what you need. Matching uses your resume skills, title, and preferences.
          </p>
        )}

        {search.isPending ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#002018]">AI Job Agent is working…</p>
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li>1. Planning a search from your profile</li>
              <li>2. Discovering roles on authorized boards + Atelier employers</li>
              <li>3. Scoring fits and enriching the best matches</li>
            </ol>
            <div className="h-2 overflow-hidden rounded-full bg-[#eef2f0]">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[#2f9a6f]" />
            </div>
          </div>
        ) : null}

        {careerSnap ? (
          <div className="rounded-2xl border border-[#e7ebe9] bg-[#f7faf8] p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#c6a15b]">
              {careerSnap.aiLane === 'sol' ? 'GPT coach' : 'Career engine'}
            </p>
            <h3 className="mt-1 font-serif text-xl text-[#002018]">{careerSnap.headline}</h3>
            {careerSnap.strategy ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{careerSnap.strategy}</p>
            ) : null}
            {careerSnap.advice?.length ? (
              <ul className="mt-3 space-y-1.5 text-sm text-[#002018]">
                {careerSnap.advice.slice(0, 4).map((line) => (
                  <li key={line} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2f9a6f]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Button variant="outline" className="mt-4 rounded-full" asChild>
              <Link to="/app/career">Open full career coach</Link>
            </Button>
          </div>
        ) : null}

        {preview.length ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[#002018]">Top AI matches from this run</p>
              <Link to="/app/jobs" className="text-sm font-medium text-[#2f9a6f] hover:underline">
                See all →
              </Link>
            </div>
            <div className="grid gap-2">
              {preview.map((m) => (
                <div
                  key={m.job.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7ebe9] bg-white px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#002018]">{m.job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.job.company} · {moneyBand(m.job.salaryMin, m.job.salaryMax, m.job.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f6ef] px-2.5 py-1 text-xs font-semibold text-[#2f9a6f]">
                      <CheckCircle2 className="size-3.5" />
                      {m.score}%
                    </span>
                    <Button
                      size="sm"
                      className="rounded-full bg-[#002018] !text-white"
                      disabled={apply.isPending}
                      onClick={() => apply.mutate(m.job.id)}
                    >
                      Prepare packet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {lastSearch && !preview.length && !search.isPending ? (
          <p className="text-sm text-muted-foreground">
            Search finished, but nothing hit 70% yet. Improve your resume or try a tighter focus query.
          </p>
        ) : null}
      </div>
    </section>
  )
}
