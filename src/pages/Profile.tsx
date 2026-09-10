import { Link } from 'react-router-dom'
import {
  Briefcase,
  Building2,
  Clock,
  Globe,
  MapPin,
  Pencil,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { displayName } from '@shared/types'
import { initials, profileCompleteness, salaryMoney } from '@/lib/utils'
import { Badge, Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SocialConnectForm } from '@/components/social/SocialConnectForm'
import { SOCIAL_LINK_FIELDS } from '@/lib/social'

export function ProfilePage() {
  const { profile } = useAuth()
  const name = displayName(profile)
  const place = [profile.city, profile.country].filter(Boolean).join(', ')
  const headline = profile.headline || profile.desiredTitle || profile.currentTitle
  const completeness = profileCompleteness(profile)
  const level = profile.careerLevel === 'mid' ? 'Mid-level' : titleCase(profile.careerLevel)

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-[var(--forest)] text-[var(--paper)]">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="size-16 rounded-2xl object-cover sm:size-20"
              />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#1f3d32] font-serif text-2xl text-[var(--paper)] sm:size-20 sm:text-3xl">
                {initials(name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">
                Candidate
              </p>
              <h1 className="mt-1 font-serif text-3xl leading-tight break-words sm:text-4xl">{name}</h1>
              {headline ? <p className="mt-2 text-[#d8d0c0]">{headline}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#c9c0ae]">
                {place ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#c9c0ae33] px-2.5 py-1">
                    <MapPin className="size-3.5" />
                    {place}
                  </span>
                ) : null}
                {profile.email ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#c9c0ae33] px-2.5 py-1">
                    {profile.email}
                  </span>
                ) : null}
                {profile.remoteWorldwide ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#c9c0ae33] px-2.5 py-1">
                    <Globe className="size-3.5" />
                    Remote worldwide
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Button variant="copper" asChild>
            <Link to="/app/settings">
              <Pencil className="size-4" />
              Account settings
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#c9c0ae22] sm:grid-cols-4">
          <HeroStat icon={Clock} label="Experience" value={`${profile.yearsExperience || 0} yrs`} />
          <HeroStat icon={Briefcase} label="Level" value={level} />
          <HeroStat icon={Wallet} label="Floor" value={salaryMoney(profile.salaryMin, profile.currency)} />
          <HeroStat icon={Target} label="Target" value={profile.desiredTitle || '—'} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div>
            <p className="eyebrow">What the matcher reads</p>
            <h2 className="mt-1 text-2xl">Career snapshot</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep this honest. The agent will not invent skills that are not here.
            </p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact icon={Building2} label="Industry" value={profile.industry} />
            <Fact icon={Briefcase} label="Current title" value={profile.currentTitle} />
            <Fact icon={Target} label="Desired title" value={profile.desiredTitle} />
            <Fact icon={Wallet} label="Desired salary" value={salaryMoney(profile.salaryDesired, profile.currency)} />
            <Fact icon={Globe} label="Work mode" value={profile.workModes.map(titleCase).join(', ')} />
            <Fact icon={Clock} label="Employment" value={profile.employmentTypes.map(titleCase).join(', ')} />
          </dl>
          {profile.locations.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Locations</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.locations.map((loc) => (
                  <Badge key={loc}>{loc}</Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="eyebrow">Readiness</p>
            <h2 className="mt-1 text-2xl">{completeness}%</h2>
            <p className="mt-1 text-sm text-muted-foreground">Profile completeness for matching.</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--forest)]"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <CheckLine ok={Boolean(profile.desiredTitle && profile.yearsExperience)} label="Target role and years" />
            <CheckLine ok={profile.skills.length >= 4} label="At least four core skills" />
            <CheckLine ok={profile.aiSkills.length > 0} label="AI skills listed" />
            <CheckLine ok={Boolean(profile.careerGoals)} label="Career goals written" />
            <CheckLine ok={Boolean(profile.resumeText || profile.parsedProfile)} label="Resume on file" />
          </ul>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/app/resume">Open resume</Link>
          </Button>
        </Card>
      </div>

      <Card>
        <p className="eyebrow">Elsewhere</p>
        <h2 className="mt-1 text-2xl">Social profiles</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Google, Meta, LinkedIn, and the rest — paste the public URLs so they live on your Atelier profile.
        </p>
        {Object.entries(profile.socialLinks ?? {}).filter(([, href]) => href).length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {SOCIAL_LINK_FIELDS.filter((f) => profile.socialLinks?.[f.id]).map((f) => (
              <a
                key={f.id}
                href={profile.socialLinks?.[f.id]}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-3 py-1 text-sm hover:border-[var(--forest)]"
              >
                {f.label}
              </a>
            ))}
          </div>
        ) : null}
        <SocialConnectForm />
      </Card>

      {profile.careerGoals ? (
        <Card>
          <p className="eyebrow">Direction</p>
          <h2 className="mt-1 text-2xl">Career goals</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/90">{profile.careerGoals}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Core</p>
              <h2 className="mt-1 text-2xl">Strong skills</h2>
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">{profile.skills.length}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.skills.length ? (
              profile.skills.map((s) => <Badge key={s}>{s}</Badge>)
            ) : (
              <p className="text-sm text-muted-foreground">Add skills so matches can score you fairly.</p>
            )}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">AI stack</p>
              <h2 className="mt-1 text-2xl">AI skills</h2>
            </div>
            <Sparkles className="size-4 text-[var(--copper)]" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.aiSkills.length ? (
              profile.aiSkills.map((s) => (
                <Badge key={s} tone="copper">
                  {s}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Optional — tools like OpenAI, agents, or RAG.</p>
            )}
          </div>
        </Card>
      </div>

      {profile.experience.length ? (
        <Card>
          <p className="eyebrow">History</p>
          <h2 className="mt-1 text-2xl">Experience</h2>
          <ol className="mt-5 space-y-5">
            {profile.experience.map((job) => (
              <li key={job.id} className="relative border-l border-border pl-4">
                <span className="absolute -left-1.5 top-1.5 size-3 rounded-full border border-[var(--forest)] bg-card" />
                <div className="font-medium">{job.title}</div>
                <p className="text-sm text-muted-foreground">
                  {job.company}
                  {job.start ? ` · ${job.start}` : ''}
                  {job.current ? ' — present' : job.end ? ` – ${job.end}` : ''}
                </p>
                {job.bullets?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/80">
                    {job.bullets.slice(0, 3).map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string
}) {
  return (
    <div className="bg-[var(--forest-2)] px-4 py-4">
      <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#c6a15b]">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 truncate font-serif text-lg">{value || '—'}</div>
    </div>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 px-3 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value || '—'}</div>
    </div>
  )
}

function CheckLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`size-1.5 rounded-full ${ok ? 'bg-emerald-700' : 'bg-border'}`} />
      <span className={ok ? 'text-foreground' : ''}>{label}</span>
    </li>
  )
}

function titleCase(value: string) {
  return value.replaceAll('-', ' ').replace(/^\w/, (c) => c.toUpperCase())
}
