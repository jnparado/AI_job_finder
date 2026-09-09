import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Search, X } from 'lucide-react'
import type { CareerLevel, CandidateProfile, Currency, EmploymentType, WorkMode, WorkshopNotes } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandMark } from '@/components/ui/feedback'
import { CountrySelect } from '@/components/ui/country-select'
import { useAuth } from '@/lib/auth'
import { rememberIntendedAccount } from '@/lib/supabase'
import { SocialAuth } from '@/components/social/SocialAuth'
import { cn } from '@/lib/utils'

const TOTAL = 20
const DRAFT_KEY = 'atelier-workshop-draft'
const STEP_KEY = 'atelier-workshop-step'

const INDUSTRIES = [
  'Software',
  'Health',
  'Finance',
  'Sales',
  'Marketing',
  'Retail',
  'Education',
  'People & culture',
  'Hospitality',
  'Trades',
  'Logistics',
  'Media',
  'Construction',
  'Property',
  'Climate & energy',
  'Public sector',
]

const MORE_INDUSTRIES = ['Legal', 'Science', 'Nonprofit', 'Design', 'Operations', 'Customer support']

const YEAR_BANDS: { label: string; years: number; level: CareerLevel }[] = [
  { label: 'Under a year', years: 0, level: 'junior' },
  { label: '1–3 years', years: 2, level: 'junior' },
  { label: '4–7 years', years: 5, level: 'mid' },
  { label: '8–12 years', years: 10, level: 'senior' },
  { label: '13 years or more', years: 15, level: 'lead' },
]

const PAY_BANDS: { label: string; min: number; desired: number }[] = [
  { label: 'Under $50k', min: 40000, desired: 50000 },
  { label: '$50k–$80k', min: 50000, desired: 80000 },
  { label: '$80k–$110k', min: 80000, desired: 110000 },
  { label: '$110k–$150k', min: 110000, desired: 150000 },
  { label: '$150k and up', min: 150000, desired: 180000 },
  { label: 'I will set this later', min: 80000, desired: 120000 },
]

type Draft = {
  workshop: WorkshopNotes
  desiredTitle: string
  industries: string[]
  anyIndustry: boolean
  careerLevel: CareerLevel
  yearsExperience: number
  workModes: WorkMode[]
  employmentTypes: EmploymentType[]
  salaryMin: number
  salaryDesired: number
  currency: Currency
  locations: string[]
  skills: string[]
  firstName: string
  lastName: string
  country: string
  city: string
  email: string
}

const emptyDraft = (): Draft => ({
  workshop: {},
  desiredTitle: '',
  industries: [],
  anyIndustry: false,
  careerLevel: 'mid',
  yearsExperience: 0,
  workModes: ['remote'],
  employmentTypes: ['full-time'],
  salaryMin: 80000,
  salaryDesired: 120000,
  currency: 'USD',
  locations: [],
  skills: [],
  firstName: '',
  lastName: '',
  country: '',
  city: '',
  email: '',
})

function loadDraft(): { draft: Draft; step: number } {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Draft>) : {}
    const draft = { ...emptyDraft(), ...parsed, workshop: { ...emptyDraft().workshop, ...parsed.workshop } }
    const step = Math.min(TOTAL, Math.max(1, Number(sessionStorage.getItem(STEP_KEY)) || 1))
    return { draft, step }
  } catch {
    return { draft: emptyDraft(), step: 1 }
  }
}

function toProfile(draft: Draft, base: CandidateProfile): CandidateProfile {
  const industry = draft.anyIndustry ? 'Open' : draft.industries.join(', ')
  const notes = [
    draft.workshop.employmentStatus,
    draft.workshop.urgency,
    draft.workshop.searchFriction,
    draft.workshop.help,
  ].filter(Boolean)
  return {
    ...base,
    role: 'candidate',
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email || base.email,
    country: draft.country,
    city: draft.city,
    desiredTitle: draft.desiredTitle,
    currentTitle: base.currentTitle || draft.desiredTitle,
    headline: draft.desiredTitle || base.headline,
    careerLevel: draft.careerLevel,
    yearsExperience: draft.yearsExperience,
    industry,
    workModes: draft.workModes.length ? draft.workModes : ['remote'],
    employmentTypes: draft.employmentTypes.length ? draft.employmentTypes : ['full-time'],
    salaryMin: draft.salaryMin,
    salaryDesired: draft.salaryDesired,
    currency: draft.currency,
    locations: draft.locations,
    remoteWorldwide: draft.locations.includes('Remote worldwide'),
    skills: draft.skills,
    careerGoals: notes.join(' · '),
    workshop: draft.workshop,
    onboardingCompleted: true,
  }
}

export function CandidateWorkshop() {
  const { user, demo, profile, saveProfile, signUpEmail, configured } = useAuth()
  const navigate = useNavigate()
  const signedIn = Boolean(user || demo)
  const [{ draft, step: savedStep }] = useState(loadDraft)
  const [step, setStep] = useState(savedStep)
  const [d, setD] = useState(draft)
  const [skillInput, setSkillInput] = useState('')
  const [moreIndustries, setMoreIndustries] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    rememberIntendedAccount('candidate')
  }, [])

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    sessionStorage.setItem(STEP_KEY, String(step))
  }, [d, step])

  if (profile.role === 'employer' && signedIn) {
    return <Navigate to="/employer" replace />
  }
  if (signedIn && profile.onboardingCompleted && profile.desiredTitle) {
    return <Navigate to="/app" replace />
  }

  function patch(next: Partial<Draft>) {
    setD((cur) => ({ ...cur, ...next }))
  }

  function patchWorkshop(next: Partial<WorkshopNotes>) {
    setD((cur) => ({ ...cur, workshop: { ...cur.workshop, ...next } }))
  }

  function go(n: number) {
    setError('')
    setStep(Math.min(TOTAL, Math.max(1, n)))
  }

  function pickAndGo(apply: () => void) {
    apply()
    window.setTimeout(() => go(step + 1), 120)
  }

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
  }

  async function finishAccount() {
    setError('')
    setBusy(true)
    try {
      if (!signedIn) {
        if (!configured) throw new Error('Add your Supabase keys in .env, then restart the app.')
        if (password.length < 8) throw new Error('Use at least 8 characters for the password.')
        const created = await signUpEmail(d.email, password, { role: 'candidate' })
        await saveProfile(toProfile(d, created))
      } else {
        await saveProfile(toProfile(d, profile))
      }
      sessionStorage.removeItem(DRAFT_KEY)
      sessionStorage.removeItem(STEP_KEY)
      navigate('/app', { replace: true })
    } catch (err) {
      if (err instanceof Error && (err as Error & { code?: string }).code === 'confirm') {
        navigate('/verify')
        return
      }
      setError(err instanceof Error ? err.message : 'Could not open the workshop.')
    } finally {
      setBusy(false)
    }
  }

  const industries = moreIndustries ? [...INDUSTRIES, ...MORE_INDUSTRIES] : INDUSTRIES

  return (
    <div className="min-h-svh bg-white text-foreground">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <button
            type="button"
            aria-label="Back"
            className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted"
            onClick={() => (step > 1 ? go(step - 1) : navigate('/'))}
          >
            <ArrowLeft className="size-5" />
          </button>
          <Link to="/" aria-label="Atelier home">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-1">
            <span className="grid size-10 place-items-center rounded-full border border-border text-xs font-medium">
              {step}/{TOTAL}
            </span>
            <button
              type="button"
              aria-label="Close"
              className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted"
              onClick={() => navigate('/')}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-muted">
          <div className="h-full bg-[var(--forest)] transition-[width]" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100svh-5.5rem)] max-w-xl flex-col px-4 py-10 sm:py-14">
        <div className="flex-1">
          {step === 1 ? (
            <Ask title="Where are you in your work life right now?">
              <Choices
                value={d.workshop.employmentStatus}
                options={[
                  'Between roles and need something soon',
                  'Between roles, taking my time',
                  'Working, ready to move',
                  'Working, open if the right thing appears',
                ]}
                onPick={(v) => pickAndGo(() => patchWorkshop({ employmentStatus: v }))}
              />
            </Ask>
          ) : null}

          {step === 2 ? (
            <Ask title="How soon do you want a new role?">
              <Choices
                value={d.workshop.urgency}
                options={['This month', 'In the next quarter', 'Later this year', 'Just mapping the market']}
                onPick={(v) => pickAndGo(() => patchWorkshop({ urgency: v }))}
              />
            </Ask>
          ) : null}

          {step === 3 ? (
            <Ask title="Have you used a matching workshop like this before?">
              <Choices
                value={d.workshop.usedAiTools}
                options={['Yes', 'Not yet', 'Unsure']}
                onPick={(v) => pickAndGo(() => patchWorkshop({ usedAiTools: v }))}
              />
            </Ask>
          ) : null}

          {step === 4 ? (
            <Ask title="This is a workshop, not a spray cannon.">
              <div className="rounded-3xl border border-[#d4dbd6] bg-[#eef1ee] p-5 text-left">
                <ul className="space-y-3 text-sm leading-relaxed">
                  {[
                    ['Match scores', ' so you spend time on roles that actually overlap.'],
                    ['One profile', ' drafts every packet — you still approve the send.'],
                    ['Letter, resume, and tracking', ' sit in one place.'],
                    ['You keep the hour', ' for the interview, not another empty form.'],
                  ].map(([lead, rest]) => (
                    <li key={lead} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--forest)]" />
                      <span>
                        <strong>{lead}</strong>
                        {rest}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Continue onClick={() => go(5)} />
            </Ask>
          ) : null}

          {step === 5 ? (
            <Ask title="What is the hardest part of looking right now?">
              <Choices
                value={d.workshop.searchFriction}
                options={[
                  'I send things and hear nothing',
                  'Tailoring each packet eats the week',
                  'Listings look close but are not a fit',
                  'I do not know where to begin',
                ]}
                onPick={(v) => pickAndGo(() => patchWorkshop({ searchFriction: v }))}
              />
            </Ask>
          ) : null}

          {step === 6 ? (
            <Ask title="Fit first. Then a packet you still own.">
              <p className="text-muted-foreground">
                Atelier scores the role against your real resume and drafts the letter. Nothing leaves until you approve.
                Atelier employers get the packet in their inbox. LinkedIn, Indeed, and Upwork still require you to submit
                on their page — we do not click Apply there.
              </p>
              <Continue onClick={() => go(7)} />
            </Ask>
          ) : null}

          {step === 7 ? (
            <Ask title="What do you want help with in your job search?">
              <Choices
                value={d.workshop.help}
                options={[
                  'Score roles against my resume',
                  'Draft letters I can edit',
                  'Send packets to Atelier employers after I approve',
                  'Keep replies and interviews in one place',
                  'All of the above',
                ]}
                onPick={(v) => pickAndGo(() => patchWorkshop({ help: v }))}
              />
            </Ask>
          ) : null}

          {step === 8 ? (
            <Ask title="What title are you aiming for?">
              <label className="block text-left">
                <span className="text-sm text-muted-foreground">Title or keyword</span>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-12 rounded-2xl pl-10"
                    placeholder="e.g. Product designer"
                    value={d.desiredTitle}
                    onChange={(e) => patch({ desiredTitle: e.target.value })}
                  />
                </div>
              </label>
              <p className="mt-3 text-left text-sm text-muted-foreground">
                A specific title scores more honestly than a vague one.
              </p>
              <Continue disabled={!d.desiredTitle.trim()} onClick={() => go(9)} />
            </Ask>
          ) : null}

          {step === 9 ? (
            <Ask title="Which fields should we search?">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {industries.map((name) => {
                  const on = d.industries.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => patch({ anyIndustry: false, industries: toggle(d.industries, name) })}
                      className={cn(
                        'rounded-2xl border px-3 py-3 text-sm',
                        on ? 'border-[var(--forest)] bg-[#eef1ee]' : 'border-border bg-white hover:border-[var(--forest)]',
                      )}
                    >
                      {name}
                    </button>
                  )
                })}
                {!moreIndustries ? (
                  <button
                    type="button"
                    className="rounded-2xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
                    onClick={() => setMoreIndustries(true)}
                  >
                    More fields
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => patch({ anyIndustry: true, industries: [] })}
                className={cn(
                  'mt-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm',
                  d.anyIndustry ? 'border-[var(--forest)] bg-[#eef1ee]' : 'border-border bg-white',
                )}
              >
                <span className={cn('grid size-4 rounded-full border', d.anyIndustry ? 'border-[var(--forest)] bg-[var(--forest)]' : 'border-input')} />
                Open to any field
              </button>
              <Continue disabled={!d.anyIndustry && !d.industries.length} onClick={() => go(10)} />
            </Ask>
          ) : null}

          {step === 10 ? (
            <Ask title="Which seniority feels honest?">
              <Choices
                value={d.careerLevel}
                options={[
                  { value: 'junior', label: 'Starting out', detail: 'Early in this kind of work' },
                  { value: 'mid', label: 'A few solid years', detail: 'I can own a slice of the work' },
                  { value: 'senior', label: 'Seasoned', detail: 'I can lead a project without much cover' },
                  { value: 'manager', label: 'People lead', detail: 'Director, VP, or similar' },
                  { value: 'executive', label: 'Not sure yet', detail: 'Help me place it' },
                ]}
                onPick={(v) => pickAndGo(() => patch({ careerLevel: v as CareerLevel }))}
              />
            </Ask>
          ) : null}

          {step === 11 ? (
            <Ask title="A count of years is not the whole story.">
              <p className="text-muted-foreground">
                We weigh the work you have done — skills, title overlap, and how you describe the next role — not only a
                number on a CV.
              </p>
              <Continue onClick={() => go(12)} />
            </Ask>
          ) : null}

          {step === 12 ? (
            <Ask title="How long have you been doing this kind of work?">
              <Choices
                value={String(d.yearsExperience)}
                options={YEAR_BANDS.map((b) => ({ value: String(b.years), label: b.label }))}
                onPick={(v) => {
                  const band = YEAR_BANDS.find((b) => String(b.years) === v)
                  pickAndGo(() =>
                    patch({
                      yearsExperience: band?.years ?? 0,
                      careerLevel: d.careerLevel === 'executive' ? band?.level ?? 'mid' : d.careerLevel,
                    }),
                  )
                }}
              />
            </Ask>
          ) : null}

          {step === 13 ? (
            <Ask title="Where can you show up?">
              <Choices
                multi
                value={d.workModes}
                options={[
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'onsite', label: 'On-site' },
                ]}
                onToggle={(v) => patch({ workModes: toggle(d.workModes, v as WorkMode) })}
              />
              <Continue disabled={!d.workModes.length} onClick={() => go(14)} />
            </Ask>
          ) : null}

          {step === 14 ? (
            <Ask title="What kind of hire?">
              <Choices
                multi
                value={d.employmentTypes}
                options={[
                  { value: 'full-time', label: 'Full-time' },
                  { value: 'part-time', label: 'Part-time' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'freelance', label: 'Freelance' },
                ]}
                onToggle={(v) => patch({ employmentTypes: toggle(d.employmentTypes, v as EmploymentType) })}
              />
              <Continue disabled={!d.employmentTypes.length} onClick={() => go(15)} />
            </Ask>
          ) : null}

          {step === 15 ? (
            <Ask title="What pay floor should we respect?">
              <Choices
                value={`${d.salaryMin}-${d.salaryDesired}`}
                options={PAY_BANDS.map((b) => ({ value: `${b.min}-${b.desired}`, label: b.label }))}
                onPick={(v) => {
                  const band = PAY_BANDS.find((b) => `${b.min}-${b.desired}` === v)
                  pickAndGo(() => patch({ salaryMin: band?.min ?? 80000, salaryDesired: band?.desired ?? 120000 }))
                }}
              />
            </Ask>
          ) : null}

          {step === 16 ? (
            <Ask title="Where should listings be?">
              <Choices
                multi
                value={d.locations}
                options={['Remote worldwide', 'United States', 'Canada', 'Europe', 'Philippines', 'Australia', 'United Kingdom']}
                onToggle={(v) => patch({ locations: toggle(d.locations, v) })}
              />
              <Continue disabled={!d.locations.length} onClick={() => go(17)} />
            </Ask>
          ) : null}

          {step === 17 ? (
            <Ask title="Which skills should we score against?">
              <p className="text-sm text-muted-foreground">Type a skill and press Enter. You can add more from a resume later.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {d.skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-[var(--forest)] bg-[var(--forest)] px-3 py-1 text-sm text-[var(--paper)]"
                    onClick={() => patch({ skills: d.skills.filter((x) => x !== s) })}
                  >
                    {s} ×
                  </button>
                ))}
              </div>
              <Input
                className="mt-3 h-12 rounded-2xl"
                placeholder="React, Figma, Python…"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  const next = skillInput.split(',').map((s) => s.trim()).filter(Boolean)
                  patch({ skills: [...new Set([...d.skills, ...next])] })
                  setSkillInput('')
                }}
              />
              <Continue onClick={() => go(18)} />
            </Ask>
          ) : null}

          {step === 18 ? (
            <Ask title="What should we call you?">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input className="h-12 rounded-2xl" placeholder="First name" value={d.firstName} onChange={(e) => patch({ firstName: e.target.value })} />
                <Input className="h-12 rounded-2xl" placeholder="Last name" value={d.lastName} onChange={(e) => patch({ lastName: e.target.value })} />
              </div>
              <Continue disabled={!d.firstName.trim()} onClick={() => go(19)} />
            </Ask>
          ) : null}

          {step === 19 ? (
            <Ask title="Where are you based?">
              <CountrySelect value={d.country} onChange={(country) => patch({ country })} />
              <Input className="mt-3 h-12 rounded-2xl" placeholder="City (optional)" value={d.city} onChange={(e) => patch({ city: e.target.value })} />
              <Continue disabled={!d.country.trim()} onClick={() => go(20)} />
            </Ask>
          ) : null}

          {step === 20 ? (
            <Ask
              title={signedIn ? 'The workshop is ready.' : 'Open your workshop.'}
              lead={
                signedIn
                  ? 'We will save this profile and start matching authorized listings against it.'
                  : 'Create an account so the packet, scores, and messages stay with you. Nothing is sent until you approve.'
              }
            >
              {signedIn ? (
                <div>
                  {error ? <p className="mb-3 text-sm text-[#8f4326]">{error}</p> : null}
                  <Continue label={busy ? 'Saving…' : 'Enter the workshop'} disabled={busy} onClick={() => void finishAccount()} />
                </div>
              ) : (
                <form
                  className="space-y-3 text-left"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void finishAccount()
                  }}
                >
                  <Input
                    className="h-12 rounded-2xl"
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={d.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    required
                  />
                  <Input
                    className="h-12 rounded-2xl"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Password (8+ characters)"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {error ? <p className="text-sm text-[#8f4326]">{error}</p> : null}
                  <Button variant="copper" className="h-12 w-full rounded-2xl" type="submit" disabled={busy}>
                    {busy ? 'Creating…' : 'Create account'}
                  </Button>
                  <SocialAuth disabled={busy} />
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-[var(--copper)]">
                      Sign in
                    </Link>
                  </p>
                </form>
              )}
            </Ask>
          ) : null}
        </div>

        {step < TOTAL ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            Hiring instead?{' '}
            <Link to="/register?role=employer" className="font-medium text-[var(--copper)]">
              Employer sign up
            </Link>
          </p>
        ) : null}
      </main>
    </div>
  )
}

function Ask({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
      {lead ? <p className="mt-3 text-muted-foreground">{lead}</p> : null}
      <div className="mt-8">{children}</div>
    </div>
  )
}

function Continue({ onClick, disabled, label = 'Continue' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <Button variant="copper" className="mt-8 h-12 w-full rounded-2xl" disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  )
}

type Choice = string | { value: string; label: string; detail?: string }

function Choices({
  value,
  options,
  onPick,
  multi,
  onToggle,
}: {
  value?: string | string[]
  options: Choice[]
  onPick?: (value: string) => void
  multi?: boolean
  onToggle?: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const item = typeof opt === 'string' ? { value: opt, label: opt } : opt
        const selected = Array.isArray(value) ? value.includes(item.value) : value === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => (multi ? onToggle?.(item.value) : onPick?.(item.value))}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors',
              selected ? 'border-[var(--forest)] bg-[#eef1ee]' : 'border-border bg-white hover:border-[var(--forest)]',
            )}
          >
            {multi ? (
              <span className={cn('grid size-4 shrink-0 rounded-full border', selected ? 'border-[var(--forest)] bg-[var(--forest)]' : 'border-input')} />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{item.label}</span>
              {item.detail ? <span className="mt-0.5 block text-sm text-muted-foreground">{item.detail}</span> : null}
            </span>
            {!multi && selected ? <Check className="size-4 shrink-0 text-[var(--forest)]" /> : null}
          </button>
        )
      })}
    </div>
  )
}
