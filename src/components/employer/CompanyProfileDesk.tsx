import { useMemo, useState, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Eye,
  Globe2,
  Heart,
  MapPin,
  Pencil,
  Play,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { localBrandPath } from '@/lib/brandAssets'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/card'

const EXTRA_KEY = 'atelier-employer-company-extra'

type DeskTab = 'overview' | 'about' | 'culture' | 'benefits' | 'team' | 'media' | 'social' | 'settings'

interface CompanyValue {
  title: string
  body: string
}

interface CompanyExtra {
  coverUrl: string
  logoUrl: string
  tagline: string
  mission: string
  vision: string
  about: string
  culture: string
  benefits: string
  team: string
  videoUrl: string
  videoTitle: string
  founded: string
  employees: string
  workSetup: string
  visibility: 'public' | 'private'
  values: CompanyValue[]
}

const DEFAULT_VALUES: CompanyValue[] = [
  { title: 'Innovation', body: 'We build better ways to hire and grow.' },
  { title: 'Collaboration', body: 'Great work happens when teams trust each other.' },
  { title: 'Integrity', body: 'Candidates approve every packet before it is sent.' },
  { title: 'Impact', body: 'We hire people who raise the bar for the work.' },
]

function emptyExtra(): CompanyExtra {
  return {
    coverUrl: '',
    logoUrl: '',
    tagline: '',
    mission: '',
    vision: '',
    about: '',
    culture: '',
    benefits: '',
    team: '',
    videoUrl: '',
    videoTitle: 'Our Story',
    founded: '',
    employees: '',
    workSetup: '',
    visibility: 'public',
    values: DEFAULT_VALUES,
  }
}

function readExtra(userId?: string): CompanyExtra {
  try {
    const raw = localStorage.getItem(`${EXTRA_KEY}:${userId || 'local'}`)
    if (!raw) return emptyExtra()
    const parsed = JSON.parse(raw) as Partial<CompanyExtra>
    return {
      ...emptyExtra(),
      ...parsed,
      values: Array.isArray(parsed.values) && parsed.values.length ? parsed.values : DEFAULT_VALUES,
    }
  } catch {
    return emptyExtra()
  }
}

function writeExtra(userId: string | undefined, extra: CompanyExtra) {
  localStorage.setItem(`${EXTRA_KEY}:${userId || 'local'}`, JSON.stringify(extra))
}

const TABS: { id: DeskTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'about', label: 'About' },
  { id: 'culture', label: 'Culture' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'team', label: 'Team' },
  { id: 'media', label: 'Media' },
  { id: 'social', label: 'Social Links' },
  { id: 'settings', label: 'Settings' },
]

export function CompanyProfileDesk() {
  const { profile, saveProfile } = useAuth()
  const [tab, setTab] = useState<DeskTab>('overview')
  const [editing, setEditing] = useState<DeskTab | 'header' | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const [companyName, setCompanyName] = useState(profile.companyName ?? '')
  const [companyWebsite, setCompanyWebsite] = useState(profile.companyWebsite ?? '')
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [headline, setHeadline] = useState(profile.headline)
  const [industry, setIndustry] = useState(profile.industry)
  const [city, setCity] = useState(profile.city)
  const [country, setCountry] = useState(profile.country)
  const [careerGoals, setCareerGoals] = useState(profile.careerGoals)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [social, setSocial] = useState({
    linkedin: profile.socialLinks?.linkedin ?? '',
    facebook: profile.socialLinks?.facebook ?? '',
    x: profile.socialLinks?.x ?? profile.socialLinks?.twitter ?? '',
    youtube: profile.socialLinks?.youtube ?? '',
  })
  const [extra, setExtra] = useState(() => readExtra(profile.id))

  const company = companyName.trim() || 'Your company'
  const tagline = (extra.tagline || headline).trim() || 'Tell candidates what your company stands for.'
  const about = (extra.about || careerGoals).trim()
  const cover = extra.coverUrl || localBrandPath('employer-office.jpg', 'employer')
  const logo = extra.logoUrl || avatarUrl
  const place = [city, country].filter(Boolean).join(', ') || 'Location not set'
  const site = companyWebsite.trim()

  const checks = useMemo(() => {
    const rows = [
      { label: 'Company basic information', done: Boolean(companyName.trim()) },
      { label: 'Logo uploaded', done: Boolean(logo) },
      { label: 'Cover photo added', done: Boolean(extra.coverUrl) },
      { label: 'About / description', done: Boolean(about) },
      { label: 'Website & location', done: Boolean(site || city || country) },
      { label: 'Social links', done: Boolean(social.linkedin || social.facebook || social.x || social.youtube) },
      { label: 'Mission & vision', done: Boolean(extra.mission.trim() && extra.vision.trim()) },
      { label: 'Add team notes', done: Boolean(extra.team.trim()) },
    ]
    const done = rows.filter((row) => row.done).length
    return { rows, done, pct: Math.round((done / rows.length) * 100) }
  }, [companyName, logo, extra.coverUrl, about, site, city, country, social, extra.mission, extra.vision, extra.team])

  function patchExtra(patch: Partial<CompanyExtra>) {
    setExtra((cur) => {
      const next = { ...cur, ...patch }
      writeExtra(profile.id, next)
      return next
    })
  }

  async function saveCore() {
    setBusy(true)
    setNotice('')
    try {
      await saveProfile({
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        headline: (extra.tagline || headline).trim(),
        industry: industry.trim(),
        city: city.trim(),
        country: country.trim(),
        careerGoals: (extra.about || careerGoals).trim(),
        avatarUrl: (extra.logoUrl || avatarUrl).trim(),
        socialLinks: {
          linkedin: social.linkedin.trim(),
          facebook: social.facebook.trim(),
          x: social.x.trim(),
          youtube: social.youtube.trim(),
        },
      })
      writeExtra(profile.id, extra)
      setNotice('Saved.')
      setEditing(null)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    await saveCore()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/employer" className="hover:text-foreground">
              Employer
            </Link>
            <span className="px-1.5">›</span>
            <span className="text-foreground">Company Profile</span>
          </p>
          <h1 className="mt-1 font-serif text-2xl leading-tight text-[var(--forest)] sm:text-3xl">Company Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Showcase your company, build trust, and attract top talent.
          </p>
        </div>
        <Button variant="outline" className="rounded-full" asChild>
          <a href={site || '#'} target={site ? '_blank' : undefined} rel="noreferrer">
            <Eye className="size-4" />
            Preview Profile
          </a>
        </Button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#e4ebe6] bg-white shadow-[0_10px_28px_rgba(19,38,31,0.04)]">
            <div className="relative h-40 sm:h-48 lg:h-56">
              <img src={cover} alt="" className="h-full w-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--forest)]/75 via-[var(--forest)]/35 to-transparent" />
              <p className="absolute left-5 top-1/2 hidden max-w-[14rem] -translate-y-1/2 font-serif text-lg italic leading-snug text-white sm:block">
                Great people build great companies.
              </p>
              <button
                type="button"
                className="absolute bottom-3 right-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-medium text-[var(--forest)] shadow-sm hover:bg-white"
                onClick={() => setEditing('header')}
              >
                <Pencil className="size-3.5" />
                Edit Cover Photo
              </button>
            </div>

            <div className="relative px-4 pb-5 pt-12 sm:px-6">
              <div className="absolute -top-10 left-4 flex items-end gap-3 sm:left-6">
                <div className="grid size-20 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-[#e8f3ec] shadow-md sm:size-24">
                  {logo ? (
                    <img src={logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-serif text-3xl text-[var(--forest)]">{company.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="mb-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e4ebe6] bg-white px-3 text-xs font-medium text-[var(--forest)] hover:bg-[#f4f7f5]"
                  onClick={() => setEditing('header')}
                >
                  <Pencil className="size-3.5" />
                  Edit Logo
                </button>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 pt-2">
                  <h2 className="flex flex-wrap items-center gap-1.5 font-serif text-2xl text-[var(--forest)]">
                    <span className="truncate">{company}</span>
                    {profile.onboardingCompleted ? <BadgeCheck className="size-5 text-[#2f6fed]" /> : null}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="size-3.5 text-[#147a48]" />
                      {industry.trim() || 'Industry not set'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-[#147a48]" />
                      {place}
                    </span>
                    {site ? (
                      <a
                        href={site.startsWith('http') ? site : `https://${site}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#147a48] hover:underline"
                      >
                        <Globe2 className="size-3.5" />
                        {site.replace(/^https?:\/\//, '')}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SocialChip href={social.linkedin} label="LinkedIn" icon={LinkedInMark} />
                    <SocialChip href={social.facebook} label="Facebook" icon={FacebookMark} />
                    <SocialChip href={social.x} label="X" icon={XMark} />
                    <SocialChip href={social.youtube} label="YouTube" icon={YouTubeMark} />
                  </div>
                </div>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setEditing('header')}>
                  <Pencil className="size-4" />
                  Edit profile
                </Button>
              </div>

              <div className="mt-5 grid gap-3 border-t border-[#eef3f0] pt-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat icon={Users} label={extra.employees.trim() || 'Team size'} hint="Employees" />
                <Stat icon={Calendar} label={extra.founded.trim() || '—'} hint="Founded" />
                <Stat icon={Building2} label={country.trim() || '—'} hint="Headquarters" />
                <Stat icon={Globe2} label={extra.workSetup.trim() || '—'} hint="Work setup" />
                <Stat icon={Briefcase} label={industry.trim() || '—'} hint="Industry" />
              </div>
            </div>
          </section>

          <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#e4ebe6] px-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'shrink-0 border-b-2 px-3 py-2.5 text-sm',
                  tab === item.id
                    ? 'border-[#147a48] font-medium text-[var(--forest)]'
                    : 'border-transparent text-muted-foreground hover:text-[var(--forest)]',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'overview' ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.8fr)]">
                <Panel
                  title="Company Description"
                  onEdit={() => setEditing('overview')}
                >
                  <p className="text-sm leading-relaxed text-[#4d5a54]">
                    {about || 'Add a short description so candidates understand what you build and why people join.'}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniCard icon={Target} title="Our Mission" body={extra.mission || 'Write the mission candidates should feel in every role.'} />
                    <MiniCard icon={Sparkles} title="Our Vision" body={extra.vision || 'Share where the company is headed.'} />
                  </div>
                </Panel>
                <Panel title="Company Video" onEdit={() => setEditing('media')}>
                  <div className="relative overflow-hidden rounded-xl bg-[var(--forest)]">
                    <img
                      src={localBrandPath('employer-meeting.jpg', 'employer')}
                      alt=""
                      className="h-40 w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="grid size-12 place-items-center rounded-full bg-white/95 text-[var(--forest)] shadow-lg">
                        <Play className="size-5 fill-current" />
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-white">
                      <p className="text-sm font-medium">{extra.videoTitle || 'Our Story'}</p>
                      <p className="text-xs opacity-80">{extra.videoUrl ? 'Video link saved' : 'Add a video link'}</p>
                    </div>
                  </div>
                </Panel>
              </div>

              <Panel title="Company Values" onEdit={() => setEditing('overview')}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {extra.values.map((value) => (
                    <div key={value.title} className="rounded-xl border border-[#eef3f0] bg-[#f7faf8] p-4">
                      <Heart className="size-4 text-[#147a48]" />
                      <p className="mt-2 font-medium text-[var(--forest)]">{value.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{value.body}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          ) : null}

          {tab === 'about' ? (
            <Panel title="About" onEdit={() => setEditing('about')}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#4d5a54]">
                {about || 'Add your company story, products, and who you hire for.'}
              </p>
            </Panel>
          ) : null}

          {tab === 'culture' ? (
            <Panel title="Culture" onEdit={() => setEditing('culture')}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#4d5a54]">
                {extra.culture.trim() || 'Describe how your team works day to day.'}
              </p>
            </Panel>
          ) : null}

          {tab === 'benefits' ? (
            <Panel title="Benefits" onEdit={() => setEditing('benefits')}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#4d5a54]">
                {extra.benefits.trim() || 'List benefits candidates can expect after they are hired on Atelier.'}
              </p>
            </Panel>
          ) : null}

          {tab === 'team' ? (
            <Panel title="Team" onEdit={() => setEditing('team')}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#4d5a54]">
                {extra.team.trim() || 'Introduce the hiring managers or teams people will work with.'}
              </p>
            </Panel>
          ) : null}

          {tab === 'media' ? (
            <Panel title="Media" onEdit={() => setEditing('media')}>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">Cover, logo, and video links used on this profile.</p>
                <p>
                  <span className="font-medium text-[var(--forest)]">Cover:</span>{' '}
                  {extra.coverUrl ? 'Custom image URL saved' : 'Using Atelier office photo'}
                </p>
                <p>
                  <span className="font-medium text-[var(--forest)]">Logo:</span>{' '}
                  {logo ? 'Logo set' : 'Using company initial'}
                </p>
                <p>
                  <span className="font-medium text-[var(--forest)]">Video:</span>{' '}
                  {extra.videoUrl || 'Not set'}
                </p>
              </div>
            </Panel>
          ) : null}

          {tab === 'social' ? (
            <Panel title="Social Links" onEdit={() => setEditing('social')}>
              <ul className="space-y-2 text-sm">
                <li>LinkedIn: {social.linkedin || '—'}</li>
                <li>Facebook: {social.facebook || '—'}</li>
                <li>X: {social.x || '—'}</li>
                <li>YouTube: {social.youtube || '—'}</li>
              </ul>
            </Panel>
          ) : null}

          {tab === 'settings' ? (
            <Panel title="Settings" onEdit={() => setEditing('settings')}>
              <form className="space-y-4" onSubmit={(e) => void onSave(e)}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Your first name">
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </Field>
                  <Field label="Your last name">
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </Field>
                </div>
                <Field label="Company name">
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </Field>
                <Field label="Website">
                  <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://" />
                </Field>
                <Field label="Profile visibility">
                  <select
                    className="h-10 w-full rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm"
                    value={extra.visibility}
                    onChange={(e) => patchExtra({ visibility: e.target.value as 'public' | 'private' })}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </Field>
                <Button type="submit" className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" disabled={busy}>
                  {busy ? 'Saving…' : 'Save settings'}
                </Button>
                {notice ? <p className="text-sm text-[#147a48]">{notice}</p> : null}
              </form>
            </Panel>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_28px_rgba(19,38,31,0.04)]">
            <p className="font-medium text-[var(--forest)]">Your profile is {checks.pct}% complete!</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef3f0]">
              <div className="h-full rounded-full bg-[#147a48]" style={{ width: `${checks.pct}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {checks.rows.map((row) => (
                <li key={row.label} className="flex items-start gap-2 text-sm">
                  <span
                    className={cn(
                      'mt-0.5 grid size-4 place-items-center rounded-full',
                      row.done ? 'bg-[#147a48] text-white' : 'border border-[#d7ddd8] text-transparent',
                    )}
                  >
                    <Check className="size-2.5" />
                  </span>
                  <span className={row.done ? 'text-[var(--forest)]' : 'text-muted-foreground'}>{row.label}</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-4 w-full rounded-full bg-[#13261f] hover:bg-[#0d1b16]"
              onClick={() => setEditing(checks.pct < 100 ? 'header' : null)}
            >
              Complete Profile
            </Button>
          </div>

          <div className="rounded-2xl border border-[#dce8e0] bg-gradient-to-br from-[#e8f3ec] to-white p-4">
            <p className="font-medium text-[var(--forest)]">Get a Verified Company Badge</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish onboarding and keep your company details current so candidates can trust your listings.
            </p>
            <Button className="mt-3 rounded-full bg-[#147a48] hover:bg-[#0f5e37]" asChild>
              <Link to="/employer/finances">View hiring plan</Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-[#e4ebe6] bg-white p-4">
            <p className="text-sm font-medium text-[var(--forest)]">Profile Visibility</p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'size-2 rounded-full',
                  extra.visibility === 'public' ? 'bg-[#147a48]' : 'bg-muted-foreground',
                )}
              />
              {extra.visibility === 'public' ? 'Public' : 'Private'}
            </p>
            <Button type="button" variant="outline" className="mt-3 w-full rounded-full" onClick={() => setEditing('settings')}>
              Manage Visibility
            </Button>
          </div>
        </aside>
      </div>

      {editing ? (
        <EditSheet
          title={
            editing === 'header'
              ? 'Edit company header'
              : editing === 'overview'
                ? 'Edit overview'
                : editing === 'about'
                  ? 'Edit about'
                  : editing === 'culture'
                    ? 'Edit culture'
                    : editing === 'benefits'
                      ? 'Edit benefits'
                      : editing === 'team'
                        ? 'Edit team'
                        : editing === 'media'
                          ? 'Edit media'
                          : editing === 'social'
                            ? 'Edit social links'
                            : 'Edit settings'
          }
          onClose={() => setEditing(null)}
          onSave={() => void saveCore()}
          busy={busy}
          notice={notice}
        >
          {editing === 'header' || editing === 'settings' ? (
            <div className="space-y-3">
              <Field label="Company name">
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </Field>
              <Field label="Tagline">
                <Input
                  value={extra.tagline || headline}
                  onChange={(e) => {
                    setHeadline(e.target.value)
                    patchExtra({ tagline: e.target.value })
                  }}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Industry">
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </Field>
                <Field label="Website">
                  <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
                </Field>
                <Field label="City">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </Field>
                <Field label="Country">
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                </Field>
                <Field label="Employees">
                  <Input value={extra.employees} onChange={(e) => patchExtra({ employees: e.target.value })} placeholder="50-200" />
                </Field>
                <Field label="Founded">
                  <Input value={extra.founded} onChange={(e) => patchExtra({ founded: e.target.value })} placeholder="2018" />
                </Field>
                <Field label="Work setup">
                  <Input value={extra.workSetup} onChange={(e) => patchExtra({ workSetup: e.target.value })} placeholder="Global / Hybrid" />
                </Field>
                <Field label="Logo image URL">
                  <Input value={extra.logoUrl || avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); patchExtra({ logoUrl: e.target.value }) }} />
                </Field>
              </div>
              <Field label="Cover image URL">
                <Input value={extra.coverUrl} onChange={(e) => patchExtra({ coverUrl: e.target.value })} placeholder="https://…" />
              </Field>
            </div>
          ) : null}

          {editing === 'overview' || editing === 'about' ? (
            <div className="space-y-3">
              <Field label="Company description">
                <Textarea
                  className="min-h-28"
                  value={extra.about || careerGoals}
                  onChange={(e) => {
                    setCareerGoals(e.target.value)
                    patchExtra({ about: e.target.value })
                  }}
                />
              </Field>
              {editing === 'overview' ? (
                <>
                  <Field label="Mission">
                    <Textarea className="min-h-20" value={extra.mission} onChange={(e) => patchExtra({ mission: e.target.value })} />
                  </Field>
                  <Field label="Vision">
                    <Textarea className="min-h-20" value={extra.vision} onChange={(e) => patchExtra({ vision: e.target.value })} />
                  </Field>
                </>
              ) : null}
            </div>
          ) : null}

          {editing === 'culture' ? (
            <Field label="Culture">
              <Textarea className="min-h-36" value={extra.culture} onChange={(e) => patchExtra({ culture: e.target.value })} />
            </Field>
          ) : null}

          {editing === 'benefits' ? (
            <Field label="Benefits">
              <Textarea className="min-h-36" value={extra.benefits} onChange={(e) => patchExtra({ benefits: e.target.value })} />
            </Field>
          ) : null}

          {editing === 'team' ? (
            <Field label="Team">
              <Textarea className="min-h-36" value={extra.team} onChange={(e) => patchExtra({ team: e.target.value })} />
            </Field>
          ) : null}

          {editing === 'media' ? (
            <div className="space-y-3">
              <Field label="Video title">
                <Input value={extra.videoTitle} onChange={(e) => patchExtra({ videoTitle: e.target.value })} />
              </Field>
              <Field label="Video URL">
                <Input value={extra.videoUrl} onChange={(e) => patchExtra({ videoUrl: e.target.value })} placeholder="https://…" />
              </Field>
              <Field label="Cover image URL">
                <Input value={extra.coverUrl} onChange={(e) => patchExtra({ coverUrl: e.target.value })} />
              </Field>
              <Field label="Logo image URL">
                <Input value={extra.logoUrl || avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); patchExtra({ logoUrl: e.target.value }) }} />
              </Field>
            </div>
          ) : null}

          {editing === 'social' ? (
            <div className="space-y-3">
              <Field label="LinkedIn">
                <Input value={social.linkedin} onChange={(e) => setSocial((cur) => ({ ...cur, linkedin: e.target.value }))} />
              </Field>
              <Field label="Facebook">
                <Input value={social.facebook} onChange={(e) => setSocial((cur) => ({ ...cur, facebook: e.target.value }))} />
              </Field>
              <Field label="X">
                <Input value={social.x} onChange={(e) => setSocial((cur) => ({ ...cur, x: e.target.value }))} />
              </Field>
              <Field label="YouTube">
                <Input value={social.youtube} onChange={(e) => setSocial((cur) => ({ ...cur, youtube: e.target.value }))} />
              </Field>
            </div>
          ) : null}
        </EditSheet>
      ) : null}
    </div>
  )
}

function LinkedInMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6.5 8.5H3.7V21h2.8V8.5ZM5.1 3a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3ZM20.3 21h-2.8v-6.1c0-1.45-.52-2.44-1.82-2.44-1 0-1.59.67-1.85 1.32-.1.23-.12.55-.12.87V21H11V8.5h2.7v1.7c.36-.55 1-1.95 2.92-1.95 2.13 0 3.68 1.39 3.68 4.38V21Z" />
    </svg>
  )
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M14.5 21v-7.2h2.4l.36-2.8H14.5V9.2c0-.81.22-1.36 1.39-1.36H17.4V5.34C17.08 5.3 16 5.2 14.73 5.2c-2.64 0-4.45 1.61-4.45 4.57v2.23H7.8v2.8h2.48V21h4.22Z" />
    </svg>
  )
}

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.4l4.4 5.8L18.9 2Zm-1.1 18h1.7L7.3 4H5.5l12.3 16Z" />
    </svg>
  )
}

function YouTubeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C17.9 5 12 5 12 5s-5.9 0-7.7.3a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6.1 19 12 19 12 19s5.9 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z" />
    </svg>
  )
}

type SocialIcon = (props: { className?: string }) => ReactElement

function SocialChip({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: SocialIcon
}) {
  if (!href.trim()) return null
  const to = href.startsWith('http') ? href : `https://${href}`
  return (
    <a
      href={to}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="grid size-8 place-items-center rounded-full border border-[#e4ebe6] text-[var(--forest)] hover:bg-[#eef3f0]"
    >
      <Icon className="size-3.5" />
    </a>
  )
}

function Stat({ icon: Icon, label, hint }: { icon: typeof Users; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#147a48]" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--forest)]">{label}</p>
        <p className="text-[0.7rem] text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

function Panel({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit?: () => void
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_28px_rgba(19,38,31,0.04)] sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-serif text-xl text-[var(--forest)]">{title}</h3>
        {onEdit ? (
          <button type="button" className="inline-flex items-center gap-1 text-sm text-[#147a48] hover:underline" onClick={onEdit}>
            <Pencil className="size-3.5" />
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function MiniCard({ icon: Icon, title, body }: { icon: typeof Target; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#eef3f0] bg-[#f7faf8] p-3">
      <Icon className="size-4 text-[#147a48]" />
      <p className="mt-2 text-sm font-medium text-[var(--forest)]">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  )
}

function EditSheet({
  title,
  children,
  onClose,
  onSave,
  busy,
  notice,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onSave: () => void
  busy: boolean
  notice: string
}) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-end bg-[#13261f]/40 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#e4ebe6] bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-2xl text-[var(--forest)]">{title}</h2>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" disabled={busy} onClick={onSave}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {notice ? <p className="mt-3 text-sm text-[#147a48]">{notice}</p> : null}
      </div>
    </div>
  )
}
