import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import type { CareerLevel, Currency, EmploymentType, WorkMode } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/card'
import { BrandMark } from '@/components/ui/feedback'
import { CountrySelect } from '@/components/ui/country-select'
import { useAuth } from '@/lib/auth'

const STEPS = [
  { n: 1, title: 'Basics' },
  { n: 2, title: 'Career' },
  { n: 3, title: 'Skills' },
  { n: 4, title: 'Preferences' },
  { n: 5, title: 'Salary' },
  { n: 6, title: 'Locations' },
]

const LEVELS: CareerLevel[] = ['junior', 'mid', 'senior', 'lead', 'manager', 'executive']
const MODES: WorkMode[] = ['remote', 'hybrid', 'onsite']
const TYPES: EmploymentType[] = ['full-time', 'part-time', 'contract', 'freelance']
const LOCS = ['Remote worldwide', 'Philippines', 'USA', 'Canada', 'Australia', 'Europe']
const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PHP']

export function OnboardingPage() {
  const { profile, saveProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [local, setLocal] = useState<Partial<typeof profile>>({})
  const [skillInput, setSkillInput] = useState('')
  const draft = { ...profile, ...local }

  if (profile.role === 'employer') {
    return <Navigate to="/employer" replace />
  }

  function patch<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setLocal((d) => ({ ...d, [key]: value }))
  }

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  async function complete() {
    await saveProfile({
      ...draft,
      remoteWorldwide: draft.locations.includes('Remote worldwide'),
      onboardingCompleted: true,
      headline: draft.headline || draft.desiredTitle || draft.currentTitle,
    })
    navigate('/app')
  }

  function fillSample() {
    setLocal({
      firstName: 'Alex',
      lastName: 'Rivera',
      email: draft.email || 'alex.rivera@email.com',
      country: 'Philippines',
      city: 'Manila',
      currentTitle: 'Full Stack Developer',
      desiredTitle: 'Senior Full Stack Engineer',
      yearsExperience: 8,
      industry: 'SaaS',
      careerLevel: 'senior',
      skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL'],
      aiSkills: ['OpenAI', 'AI Agents', 'RAG', 'n8n'],
      workModes: ['remote'],
      employmentTypes: ['full-time', 'contract'],
      salaryMin: 80000,
      salaryDesired: 140000,
      currency: 'USD',
      locations: ['Remote worldwide', 'Philippines', 'USA'],
      remoteWorldwide: true,
      careerGoals: 'Senior full stack and AI-adjacent product work, remote.',
      headline: 'Full Stack Developer',
    })
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-5">
        <Link to="/">
          <BrandMark />
        </Link>
        <Button variant="ghost" size="sm" onClick={fillSample}>
          Use sample profile
        </Button>
      </header>
      <div className="mx-auto max-w-2xl px-4 pb-28">
      <p className="eyebrow">Step {step} of 6 · {STEPS[step - 1]?.title}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Tell us about yourself</h1>
      <p className="mt-2 text-sm text-muted-foreground">Takes a couple of minutes. You can change anything later.</p>
      <ol className="mt-6 flex gap-1.5">
        {STEPS.map((s) => (
          <li key={s.n} className="flex-1">
            <button
              type="button"
              className={`h-1.5 w-full rounded-full ${s.n <= step ? 'bg-[var(--copper)]' : 'bg-muted'}`}
              onClick={() => setStep(s.n)}
              aria-label={s.title}
            />
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Card className="mt-8 space-y-4">
          <h2>Basic information</h2>
          <Grid>
            <Field label="First name"><Input value={draft.firstName} onChange={(e) => patch('firstName', e.target.value)} /></Field>
            <Field label="Last name"><Input value={draft.lastName} onChange={(e) => patch('lastName', e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={draft.email} onChange={(e) => patch('email', e.target.value)} /></Field>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <CountrySelect value={draft.country} onChange={(country) => patch('country', country)} />
            </div>
            <Field label="City" className="sm:col-span-2"><Input value={draft.city} onChange={(e) => patch('city', e.target.value)} /></Field>
          </Grid>
        </Card>
      )}

      {step === 2 && (
        <Card className="mt-8 space-y-4">
          <h2>Career</h2>
          <Grid>
            <Field label="Current job title" className="sm:col-span-2">
              <Input value={draft.currentTitle} onChange={(e) => patch('currentTitle', e.target.value)} />
            </Field>
            <Field label="Years of experience">
              <Input type="number" value={draft.yearsExperience} onChange={(e) => patch('yearsExperience', Number(e.target.value))} />
            </Field>
            <Field label="Industry">
              <Input value={draft.industry} onChange={(e) => patch('industry', e.target.value)} />
            </Field>
          </Grid>
          <Label>Career level</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <Chip key={l} on={draft.careerLevel === l} onClick={() => patch('careerLevel', l)}>
                {l === 'mid' ? 'Mid-level' : l[0].toUpperCase() + l.slice(1)}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="mt-8 space-y-4">
          <h2>Skills</h2>
          <p className="text-sm text-muted-foreground">Type a skill and press Enter. You can also extract them from a resume next.</p>
          <div className="flex flex-wrap gap-2">
            {draft.skills.map((s) => (
              <Chip key={s} on onClick={() => patch('skills', draft.skills.filter((x) => x !== s))}>{s} ×</Chip>
            ))}
          </div>
          <Input
            placeholder="React, Next.js, TypeScript…"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const next = skillInput.split(',').map((s) => s.trim()).filter(Boolean)
                patch('skills', [...new Set([...draft.skills, ...next])])
                setSkillInput('')
              }
            }}
          />
          <Field label="AI skills (comma separated)">
            <Input
              value={draft.aiSkills.join(', ')}
              onChange={(e) =>
                patch(
                  'aiSkills',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                )
              }
              placeholder="OpenAI, AI Agents, RAG, n8n"
            />
          </Field>
        </Card>
      )}

      {step === 4 && (
        <Card className="mt-8 space-y-4">
          <h2>Job preferences</h2>
          <Field label="Desired job title">
            <Input value={draft.desiredTitle} onChange={(e) => patch('desiredTitle', e.target.value)} />
          </Field>
          <Label>Work mode</Label>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <Chip key={m} on={draft.workModes.includes(m)} onClick={() => patch('workModes', toggle(draft.workModes, m))}>
                {m === 'onsite' ? 'On-site' : m[0].toUpperCase() + m.slice(1)}
              </Chip>
            ))}
          </div>
          <Label>Employment</Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((m) => (
              <Chip key={m} on={draft.employmentTypes.includes(m)} onClick={() => patch('employmentTypes', toggle(draft.employmentTypes, m))}>
                {m[0].toUpperCase() + m.slice(1)}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card className="mt-8 space-y-4">
          <h2>Salary</h2>
          <Grid>
            <Field label="Minimum salary">
              <Input type="number" value={draft.salaryMin} onChange={(e) => patch('salaryMin', Number(e.target.value))} />
            </Field>
            <Field label="Desired salary">
              <Input type="number" value={draft.salaryDesired} onChange={(e) => patch('salaryDesired', Number(e.target.value))} />
            </Field>
            <Field label="Currency" className="sm:col-span-2">
              <select
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                value={draft.currency}
                onChange={(e) => patch('currency', e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </Grid>
        </Card>
      )}

      {step === 6 && (
        <Card className="mt-8 space-y-4">
          <h2>Locations</h2>
          <div className="flex flex-wrap gap-2">
            {LOCS.map((loc) => (
              <Chip key={loc} on={draft.locations.includes(loc)} onClick={() => patch('locations', toggle(draft.locations, loc))}>
                {loc}
              </Chip>
            ))}
          </div>
          <Field label="Career goals">
            <Textarea value={draft.careerGoals} onChange={(e) => patch('careerGoals', e.target.value)} />
          </Field>
        </Card>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap gap-2">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>
          ) : null}
          {step < 6 ? (
            <Button variant="copper" onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button variant="copper" onClick={() => void complete()}>Complete profile</Button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </label>
  )
}

function Chip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-[var(--forest)] bg-[var(--forest)] text-[var(--paper)]' : 'border-border'}`}
    >
      {children}
    </button>
  )
}
