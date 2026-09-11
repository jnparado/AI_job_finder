import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Briefcase,
  Check,
  Clock,
  Globe,
  Repeat,
  Sparkles,
} from 'lucide-react'
import type { CareerLevel, Currency, EmploymentType, Job } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { currencyForLocation } from '@/lib/countries'
import { cn, moneyBand, payCodeLabel, paySymbol } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Textarea } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CountrySelect } from '@/components/ui/country-select'
import { ReadyMark } from '@/components/employer/HiringChrome'

export const DRAFT_KEY = 'atelier-employer-job-draft'
const CURRENCIES: Currency[] = ['PHP', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF']

const CATEGORIES: { name: string; subs: string[] }[] = [
  { name: 'Software', subs: ['Frontend', 'Backend', 'Full stack', 'Mobile', 'Data', 'DevOps', 'QA'] },
  { name: 'Design', subs: ['UI/UX', 'Product design', 'Brand', 'Graphic', 'Motion'] },
  { name: 'Marketing', subs: ['Content', 'Growth', 'Product marketing', 'Social'] },
  { name: 'Finance', subs: ['Accounting', 'FP&A', 'Operations'] },
  { name: 'People & culture', subs: ['Recruiting', 'People ops', 'Learning'] },
  { name: 'Sales', subs: ['Account executive', 'SDR', 'Customer success'] },
]

const TYPES: { id: EmploymentType; title: string; body: string; icon: typeof Briefcase }[] = [
  { id: 'contract', title: 'Fixed scope', body: 'One-time project with a set budget', icon: Briefcase },
  { id: 'freelance', title: 'Hourly', body: 'Pay by the hour for ongoing work', icon: Clock },
  { id: 'full-time', title: 'Ongoing', body: 'Long-term salaried role', icon: Repeat },
]

const LEVELS: { id: CareerLevel; label: string }[] = [
  { id: 'junior', label: 'Junior' },
  { id: 'mid', label: 'Intermediate' },
  { id: 'senior', label: 'Senior' },
  { id: 'lead', label: 'Lead' },
  { id: 'manager', label: 'Manager' },
]

const STEPS = [
  { n: 1, title: 'Job Details', hint: 'Basic information' },
  { n: 2, title: 'Project Requirements', hint: 'Skills and description' },
  { n: 3, title: 'Budget & Timeline', hint: 'Set your budget' },
  { n: 4, title: 'Review & Publish', hint: 'Check and post' },
]

interface Draft {
  step: number
  title: string
  category: string
  subcategory: string
  employmentType: EmploymentType
  short: string
  description: string
  skills: string
  seniority: CareerLevel
  country: string
  city: string
  remote: boolean
  salaryMin: number
  salaryMax: number
  currency: Currency
}

function emptyDraft(country: string, currency: Currency): Draft {
  return {
    step: 1,
    title: '',
    category: 'Design',
    subcategory: 'UI/UX',
    employmentType: 'contract',
    short: '',
    description: '',
    skills: '',
    seniority: 'mid',
    country,
    city: '',
    remote: true,
    salaryMin: 80000,
    salaryMax: 120000,
    currency,
  }
}

function loadDraft(fallback: Draft): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as Partial<Draft>) }
  } catch {
    return fallback
  }
}

function typeLabel(value?: string) {
  if (value === 'contract') return 'Fixed scope'
  if (value === 'freelance') return 'Hourly'
  if (value === 'full-time') return 'Ongoing'
  return (value || 'full-time').replaceAll('-', ' ')
}

function placeFromJob(job: Job) {
  const remote = job.remote
  const loc = (job.location || '').trim()
  const cleaned = loc.replace(/^Remote\s*[·•-]\s*/i, '').replace(/^Remote worldwide$/i, '').trim()
  if (!cleaned || /worldwide/i.test(loc)) {
    return { country: remote ? 'Philippines' : '', city: '', remote }
  }
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map((s) => s.trim()).filter(Boolean)
    const country = parts[parts.length - 1] ?? ''
    const city = parts.slice(0, -1).join(', ')
    return { country, city, remote }
  }
  return { country: cleaned, city: '', remote }
}

function draftFromJob(job: Job, fallback: Draft): Draft {
  const place = placeFromJob(job)
  const skills = job.skills ?? []
  const cat =
    CATEGORIES.find((c) => c.name === skills[0]) ??
    CATEGORIES.find((c) => c.subs.includes(skills[0] || '')) ??
    CATEGORIES.find((c) => skills.some((s) => c.subs.includes(s))) ??
    CATEGORIES[0]
  const subcategory =
    (cat.subs.includes(skills[1]) ? skills[1] : cat.subs.find((s) => skills.includes(s))) ?? cat.subs[0]
  const extra = skills.filter((s) => s !== cat.name && s !== subcategory)
  const parts = job.description.split(/\n\n+/)
  const short = parts[0] && parts[0].length <= 200 ? parts[0] : ''
  const description = short && parts.length > 1 ? parts.slice(1).join('\n\n') : short ? '' : job.description
  const seniority = LEVELS.some((l) => l.id === job.seniority) ? (job.seniority as CareerLevel) : 'mid'
  return {
    ...fallback,
    step: 1,
    title: job.title,
    category: cat.name,
    subcategory,
    employmentType: job.employmentType ?? 'full-time',
    short,
    description: description || job.description,
    skills: extra.join(', '),
    seniority,
    country: place.country || fallback.country,
    city: place.city,
    remote: place.remote,
    salaryMin: job.salaryMin ?? fallback.salaryMin,
    salaryMax: job.salaryMax ?? fallback.salaryMax,
    currency: job.currency ?? fallback.currency,
  }
}

function PayField({
  label,
  value,
  currency,
  onChange,
}: {
  label: string
  value: number
  currency: Currency
  onChange: (n: number) => void
}) {
  const symbol = paySymbol(currency)
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
          {symbol.trim()}
        </span>
        <Input
          className="pl-9"
          type="number"
          min={0}
          step={1000}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </label>
  )
}

export function PostJobWizard() {
  const { id: editId } = useParams()
  const editing = Boolean(editId)
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const seededCountry = profile.country?.trim() || 'Philippines'
  const seededCurrency = currencyForLocation(seededCountry, 'PHP') ?? 'PHP'
  const [d, setD] = useState<Draft>(() =>
    editing ? emptyDraft(seededCountry, seededCurrency) : loadDraft(emptyDraft(seededCountry, seededCurrency)),
  )
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const company = profile.companyName || 'Your company'
  const category = CATEGORIES.find((c) => c.name === d.category) ?? CATEGORIES[0]
  const body = [d.short.trim(), d.description.trim()].filter(Boolean).join('\n\n')
  const skillList = d.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const location = d.remote
    ? d.country
      ? `Remote · ${d.country}`
      : 'Remote worldwide'
    : [d.city, d.country].filter(Boolean).join(', ') || 'On-site'
  const titleOk = d.title.trim().length > 2
  const descOk = body.length >= 40
  const payOk = d.salaryMax >= d.salaryMin && d.salaryMin > 0
  const placeOk = Boolean(d.country.trim()) || d.remote
  const publishOk = titleOk && descOk && payOk && placeOk
  const tipCount = [titleOk, descOk, skillList.length > 0, payOk, placeOk].filter(Boolean).length

  const jobs = useQuery({
    queryKey: ['employer-jobs'],
    queryFn: () => api<Job[]>('/api/employer/jobs'),
    enabled: editing,
  })

  useEffect(() => {
    if (!editId || loadedId === editId) return
    const job = jobs.data?.find((row) => row.id === editId)
    if (!job) return
    setD(draftFromJob(job, emptyDraft(seededCountry, seededCurrency)))
    setLoadedId(editId)
    setError('')
  }, [editId, jobs.data, loadedId, seededCountry, seededCurrency])

  function patch(next: Partial<Draft>) {
    setD((cur) => ({ ...cur, ...next }))
  }

  function setCountry(country: string) {
    const currency = currencyForLocation(country, d.currency) ?? d.currency
    patch({ country, currency })
  }

  useEffect(() => {
    if (editing) return
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  }, [d, editing])

  function payload() {
    return {
      title: d.title.trim(),
      description: body,
      location,
      remote: d.remote,
      employmentType: d.employmentType,
      salaryMin: d.salaryMin,
      salaryMax: d.salaryMax,
      currency: d.currency,
      skills: [d.category, d.subcategory, ...skillList].filter(Boolean).join(', '),
      seniority: d.seniority,
    }
  }

  const save = useMutation({
    mutationFn: () =>
      editing && editId
        ? api<Job>(`/api/employer/jobs/${editId}`, { method: 'PATCH', body: JSON.stringify(payload()) })
        : api<Job>('/api/employer/jobs', { method: 'POST', body: JSON.stringify(payload()) }),
    onSuccess: async () => {
      if (!editing) sessionStorage.removeItem(DRAFT_KEY)
      await qc.invalidateQueries({ queryKey: ['employer-jobs'] })
      navigate('/employer/jobs', { replace: true })
    },
    onError: (err) => setError(err instanceof Error ? err.message : editing ? 'Could not save the job.' : 'Could not post the job.'),
  })

  function go(step: number) {
    setError('')
    patch({ step })
  }

  function saveDraft() {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    setDraftNote('Saved on this device.')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!publishOk) {
      setError('Add a title, at least 40 characters of description, pay, and a country.')
      go(!titleOk ? 1 : !descOk ? 2 : 3)
      return
    }
    save.mutate()
  }

  const previewPay = useMemo(
    () => moneyBand(d.salaryMin, d.salaryMax, d.currency),
    [d.salaryMin, d.salaryMax, d.currency],
  )

  if (editing && jobs.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading this job…</p>
  }
  if (editing && jobs.isSuccess && !jobs.data?.some((row) => row.id === editId)) {
    return (
      <div className="space-y-3">
        <p className="font-serif text-2xl text-[var(--forest)]">Job not found</p>
        <p className="text-sm text-muted-foreground">This listing is missing or belongs to another account.</p>
        <Button className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" asChild>
          <Link to="/employer/jobs">Back to My Jobs</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link to="/employer" className="hover:text-foreground">
          Employer
        </Link>
        <span className="px-1.5">›</span>
        <span className="text-foreground">{editing ? 'Edit job' : 'Post a Job'}</span>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl leading-tight text-[var(--forest)] sm:text-[2.6rem]">
            {editing ? 'Edit job' : 'Post a Job'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editing
              ? 'Update the listing. Closed roles stay off candidate search until you reopen them.'
              : 'Find the right talent by creating a clear and detailed job post.'}
          </p>
        </div>
        <div className="flex max-w-md items-center gap-3 rounded-2xl border border-[#d7ddd8] bg-[#f3f7f4] px-4 py-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--forest)] shadow-sm">
            <Briefcase className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--forest)]">Great teams start with a clear role.</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Post a job. Matched candidates send a packet only after they approve.
            </p>
          </div>
        </div>
      </div>

      <ol className="grid gap-2 rounded-2xl border border-[#e4ebe6] bg-white p-3 sm:grid-cols-4">
        {STEPS.map((step) => {
          const on = d.step === step.n
          const done = d.step > step.n
          return (
            <li key={step.n}>
              <button
                type="button"
                onClick={() => go(step.n)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left',
                  on ? 'bg-[#e8f3ec]' : 'hover:bg-[#f4f7f5]',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-full text-sm font-semibold',
                    on || done ? 'bg-[#147a48] text-white' : 'bg-[#eef3f0] text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : step.n}
                </span>
                <span>
                  <span className="block text-sm font-medium text-[var(--forest)]">{step.title}</span>
                  <span className="block text-xs text-muted-foreground">{step.hint}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <form className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-start" onSubmit={onSubmit}>
        <Card>
          {d.step === 1 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl text-[var(--forest)]">Job Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">Start with the basics. Make your job post clear and specific.</p>
              </div>
              <label className="block space-y-1.5">
                <Label>
                  Job Title <span className="text-[#b85c38]">*</span>
                </Label>
                <Input
                  value={d.title}
                  maxLength={100}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="UI/UX Designer for Website Redesign"
                  required
                />
                <p className="text-right text-xs text-muted-foreground">{d.title.trim().length}/100</p>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <Label>
                    Job Category <span className="text-[#b85c38]">*</span>
                  </Label>
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                    value={d.category}
                    onChange={(e) => {
                      const next = CATEGORIES.find((c) => c.name === e.target.value) ?? CATEGORIES[0]
                      patch({ category: next.name, subcategory: next.subs[0] })
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <Label>
                    Subcategory <span className="text-[#b85c38]">*</span>
                  </Label>
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                    value={d.subcategory}
                    onChange={(e) => patch({ subcategory: e.target.value })}
                  >
                    {category.subs.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <Label>Job Type</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {TYPES.map((type) => {
                    const on = d.employmentType === type.id
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => patch({ employmentType: type.id })}
                        className={cn(
                          'rounded-2xl border px-4 py-4 text-left transition-colors',
                          on ? 'border-[#147a48] bg-[#e8f3ec]' : 'border-[#e4ebe6] bg-white hover:border-[#147a48]',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-8 place-items-center rounded-full',
                            on ? 'bg-[#147a48] text-white' : 'bg-[#eef3f0] text-[var(--forest)]',
                          )}
                        >
                          <type.icon className="size-4" />
                        </span>
                        <span className="mt-3 block text-sm font-semibold text-[var(--forest)]">{type.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{type.body}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <label className="block space-y-1.5">
                <Label>
                  Short Description <span className="text-[#b85c38]">*</span>
                </Label>
                <Textarea
                  className="min-h-32"
                  maxLength={200}
                  value={d.short}
                  onChange={(e) => patch({ short: e.target.value })}
                  placeholder="Briefly describe what you need. This will appear in search results."
                />
                <p className="text-right text-xs text-muted-foreground">{d.short.trim().length}/200</p>
              </label>
            </div>
          ) : null}

          {d.step === 2 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl text-[var(--forest)]">Project Requirements</h2>
                <p className="mt-1 text-sm text-muted-foreground">Skills, level, and the work itself.</p>
              </div>
              <label className="block space-y-1.5">
                <Label>Skills (comma separated)</Label>
                <Input
                  value={d.skills}
                  onChange={(e) => patch({ skills: e.target.value })}
                  placeholder="Figma, user research, design systems"
                />
              </label>
              <label className="block space-y-1.5">
                <Label>Experience level</Label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => patch({ seniority: level.id })}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm',
                        d.seniority === level.id
                          ? 'border-[#147a48] bg-[#e8f3ec] text-[var(--forest)]'
                          : 'border-[#e4ebe6] text-muted-foreground hover:border-[#147a48]',
                      )}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block space-y-1.5">
                <Label>
                  Full description <span className="text-[#b85c38]">*</span>
                </Label>
                <Textarea
                  className="min-h-44"
                  value={d.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="What the person will do, the stack, and who should apply. At least 40 characters across this and the short description."
                />
                <p className={`text-xs ${descOk ? 'text-muted-foreground' : 'text-[#8f4326]'}`}>
                  {body.length}/40 characters minimum
                </p>
              </label>
            </div>
          ) : null}

          {d.step === 3 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl text-[var(--forest)]">Budget & Timeline</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pay follows the country you choose — peso in the Philippines, USD in the United States, and so on.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <Label>
                    Country <span className="text-[#b85c38]">*</span>
                  </Label>
                  <CountrySelect value={d.country} onChange={setCountry} placeholder="Search countries" />
                </label>
                <label className="block space-y-1.5">
                  <Label>City (optional)</Label>
                  <Input value={d.city} onChange={(e) => patch({ city: e.target.value })} placeholder="Manila" />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={d.remote} onChange={(e) => patch({ remote: e.target.checked })} />
                Remote
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block space-y-1.5">
                  <Label>Currency</Label>
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                    value={d.currency}
                    onChange={(e) => patch({ currency: e.target.value as Currency })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {payCodeLabel(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <PayField label="Pay min" value={d.salaryMin} currency={d.currency} onChange={(salaryMin) => patch({ salaryMin })} />
                <PayField label="Pay max" value={d.salaryMax} currency={d.currency} onChange={(salaryMax) => patch({ salaryMax })} />
              </div>
              <p className="rounded-xl bg-[#e8f3ec] px-3 py-2 text-sm text-[var(--forest)]">
                Candidates will see {previewPay} ({payCodeLabel(d.currency)}).
              </p>
            </div>
          ) : null}

          {d.step === 4 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl text-[var(--forest)]">Review & Publish</h2>
                <p className="mt-1 text-sm text-muted-foreground">Check the listing, then publish to candidate search.</p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <ReviewRow label="Title" value={d.title.trim() || '—'} />
                <ReviewRow label="Type" value={typeLabel(d.employmentType)} />
                <ReviewRow label="Category" value={`${d.category} · ${d.subcategory}`} />
                <ReviewRow label="Level" value={LEVELS.find((l) => l.id === d.seniority)?.label ?? d.seniority} />
                <ReviewRow label="Location" value={location} />
                <ReviewRow label="Pay" value={previewPay} />
              </dl>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {body || 'Add a description before publishing.'}
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-[#8f4326]">{error}</p> : null}
          {draftNote ? <p className="mt-3 text-sm text-[#147a48]">{draftNote}</p> : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4ebe6] pt-4">
            {d.step > 1 ? (
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => go(d.step - 1)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            ) : editing ? (
              <Button type="button" variant="outline" className="rounded-xl" asChild>
                <Link to="/employer/jobs">Cancel</Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" className="rounded-xl" onClick={saveDraft}>
                Save as Draft
              </Button>
            )}
            {d.step < 4 ? (
              <Button type="button" className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" onClick={() => go(d.step + 1)}>
                Next: {STEPS[d.step].title}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" disabled={save.isPending || !publishOk}>
                {save.isPending ? (editing ? 'Saving…' : 'Publishing…') : editing ? 'Save changes' : 'Publish job'}
              </Button>
            )}
          </div>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="overflow-hidden p-0 sm:p-0">
            <div className="flex items-center justify-between border-b border-[#e4ebe6] px-5 py-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Job Preview</p>
                <p className="text-xs text-muted-foreground">How your post will look to candidates.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#e4ebe6] px-2.5 py-1 text-xs text-muted-foreground">
                Preview
              </span>
            </div>
            <div className="space-y-3 p-5">
              <h2 className="font-serif text-2xl leading-tight text-[var(--forest)]">{d.title.trim() || 'Role title'}</h2>
              <p className="text-sm text-muted-foreground">{company}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#e8efe8] px-2.5 py-1 text-xs text-[var(--forest)]">{d.category}</span>
                <span className="rounded-full bg-[#e8efe8] px-2.5 py-1 text-xs text-[var(--forest)]">{d.subcategory}</span>
              </div>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{typeLabel(d.employmentType)}</span>
                <span>{previewPay}</span>
                <span>{LEVELS.find((l) => l.id === d.seniority)?.label} level</span>
              </p>
              <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Globe className="size-3.5" />
                {location}
              </p>
              <p className="text-sm leading-relaxed text-foreground/85">
                {d.short.trim() || body || 'The description will appear here as you write it.'}
              </p>
              <div className="flex gap-2 pt-2">
                <Button type="button" className="flex-1 rounded-xl bg-[#13261f]" disabled>
                  Apply Now
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" disabled>
                  <Bookmark className="size-4" />
                  Save Job
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--forest)]">
                  <Sparkles className="size-4 text-[#147a48]" />
                  Job checklist
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {editing ? 'Finish these before you save.' : 'Finish these before you publish.'}
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{tipCount}/5</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ReadyMark ready={titleOk} />
                Use a clear and specific job title
              </li>
              <li className="flex items-center gap-2">
                <ReadyMark ready={descOk} />
                Add a detailed project description
              </li>
              <li className="flex items-center gap-2">
                <ReadyMark ready={skillList.length > 0} />
                Include required skills
              </li>
              <li className="flex items-center gap-2">
                <ReadyMark ready={payOk} />
                Set a realistic budget in {payCodeLabel(d.currency)}
              </li>
              <li className="flex items-center gap-2">
                <ReadyMark ready={placeOk} />
                Choose a country so pay uses the right currency
              </li>
            </ul>
          </Card>
        </aside>
      </form>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[var(--forest)]">{value}</dd>
    </div>
  )
}
