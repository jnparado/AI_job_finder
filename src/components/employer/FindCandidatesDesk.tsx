import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Globe,
  Grid2x2,
  LayoutList,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import type { CareerLevel, Currency, Job } from '@shared/types'
import { api } from '@/lib/api'
import { localBrandPath } from '@/lib/brandAssets'
import { cn, initials, money, textSnippet } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SAVED_KEY = 'atelier-employer-saved-candidates'
const PAGE = 9

const CATEGORIES = ['Software', 'Design', 'Marketing', 'Finance', 'People & culture', 'Sales'] as const

type DeskTab = 'search' | 'recommended' | 'saved' | 'invites'
type ExperienceFilter = 'all' | 'entry' | 'intermediate' | 'expert'
type AvailabilityFilter = 'all' | 'now' | 'open'
type LocationFilter = 'all' | 'philippines' | 'remote'
type SortKey = 'match' | 'recent' | 'pay'
type ViewMode = 'grid' | 'list'

interface TalentCard {
  id: string
  name: string
  headline: string
  title: string
  city: string
  country: string
  location: string
  skills: string[]
  yearsExperience: number
  careerLevel: CareerLevel
  industry: string
  workModes: string[]
  remoteWorldwide: boolean
  salaryMin: number
  salaryDesired: number
  currency: Currency
  avatarUrl: string
  verified: boolean
  bio: string
  availability: 'now' | 'open'
  matchScore?: number
  matchedSkills?: string[]
  matchJobTitle?: string
}

interface TalentInvite {
  id: string
  candidateId: string
  candidateName: string
  jobId: string
  jobTitle: string
  createdAt: string
}

interface TalentDesk {
  people: TalentCard[]
  invites: TalentInvite[]
}

function readSaved() {
  try {
    const raw = sessionStorage.getItem(SAVED_KEY) ?? localStorage.getItem(SAVED_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeSaved(ids: string[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids))
}

function experienceBucket(person: TalentCard): Exclude<ExperienceFilter, 'all'> {
  if (person.careerLevel === 'junior' || person.yearsExperience < 3) return 'entry'
  if (person.careerLevel === 'senior' || person.careerLevel === 'lead' || person.careerLevel === 'manager' || person.yearsExperience >= 7) {
    return 'expert'
  }
  return 'intermediate'
}

function categoryOf(person: TalentCard) {
  const hay = `${person.industry} ${person.title} ${person.headline} ${person.skills.join(' ')}`.toLowerCase()
  if (/design|figma|ui|ux|brand/.test(hay)) return 'Design'
  if (/market|content|growth|social/.test(hay)) return 'Marketing'
  if (/finance|account|fp&a/.test(hay)) return 'Finance'
  if (/recruit|people|hr|learning/.test(hay)) return 'People & culture'
  if (/sales|sdr|success/.test(hay)) return 'Sales'
  if (CATEGORIES.includes(person.industry as (typeof CATEGORIES)[number])) return person.industry
  return 'Software'
}

function levelLabel(person: TalentCard) {
  if (person.careerLevel === 'junior') return 'Entry'
  if (person.careerLevel === 'mid') return 'Intermediate'
  if (person.careerLevel === 'senior') return 'Senior'
  if (person.careerLevel === 'lead') return 'Lead'
  if (person.careerLevel === 'manager') return 'Manager'
  return experienceBucket(person) === 'entry' ? 'Entry' : experienceBucket(person) === 'expert' ? 'Expert' : 'Intermediate'
}

function availabilityLabel(value: TalentCard['availability']) {
  return value === 'now' ? 'Available Now' : 'Open to Opportunities'
}

export function FindCandidatesDesk() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tab = (['search', 'recommended', 'saved', 'invites'].includes(params.get('tab') ?? '')
    ? params.get('tab')
    : 'search') as DeskTab
  const selectedId = params.get('id') ?? ''
  const query = params.get('q') ?? ''
  const [category, setCategory] = useState('all')
  const [experience, setExperience] = useState<ExperienceFilter>('all')
  const [place, setPlace] = useState<LocationFilter>('all')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [skillFilter, setSkillFilter] = useState('')
  const [payMin, setPayMin] = useState(0)
  const [sort, setSort] = useState<SortKey>('match')
  const [view, setView] = useState<ViewMode>('grid')
  const [page, setPage] = useState(0)
  const [saved, setSaved] = useState<string[]>(readSaved)
  const [inviteFor, setInviteFor] = useState<TalentCard | null>(null)
  const [inviteJobId, setInviteJobId] = useState('')
  const [inviteNote, setInviteNote] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)

  const desk = useQuery({
    queryKey: ['employer-candidates'],
    queryFn: () => api<TalentDesk>('/api/employer/candidates'),
  })
  const jobs = useQuery({
    queryKey: ['employer-jobs'],
    queryFn: () => api<Job[]>('/api/employer/jobs'),
  })

  const people = desk.data?.people ?? []
  const invites = desk.data?.invites ?? []
  const openJobs = (jobs.data ?? []).filter((job) => job.listingStatus !== 'closed')

  const skillCounts = useMemo(() => {
    const list = desk.data?.people ?? []
    const tally = new Map<string, number>()
    for (const person of list) {
      for (const skill of person.skills) {
        const key = skill.trim()
        if (!key) continue
        tally.set(key, (tally.get(key) ?? 0) + 1)
      }
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [desk.data])

  const experienceCounts = useMemo(() => {
    const list = desk.data?.people ?? []
    const tally = { entry: 0, intermediate: 0, expert: 0 }
    for (const person of list) tally[experienceBucket(person)] += 1
    return tally
  }, [desk.data])

  const locationCounts = useMemo(() => {
    const list = desk.data?.people ?? []
    return {
      philippines: list.filter((row) => /philippines|manila|cebu|davao/i.test(`${row.city} ${row.country}`)).length,
      remote: list.filter((row) => row.remoteWorldwide || row.workModes.includes('remote')).length,
    }
  }, [desk.data])

  const availabilityCounts = useMemo(() => {
    const list = desk.data?.people ?? []
    return {
      now: list.filter((row) => row.availability === 'now').length,
      open: list.filter((row) => row.availability === 'open').length,
    }
  }, [desk.data])

  const payBounds = useMemo(() => {
    const list = desk.data?.people ?? []
    const rates = list.map((row) => row.salaryDesired || row.salaryMin).filter((n) => n > 0)
    if (!rates.length) return { min: 0, max: 150000 }
    return { min: Math.min(...rates), max: Math.max(...rates) }
  }, [desk.data])

  const filtered = useMemo(() => {
    const list = desk.data?.people ?? []
    const q = query.trim().toLowerCase()
    const skill = skillFilter.trim().toLowerCase()
    let rows = list.filter((row) => {
      if (q) {
        const hay = [row.name, row.headline, row.title, row.location, row.bio, ...row.skills].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (category !== 'all' && categoryOf(row) !== category) return false
      if (experience !== 'all' && experienceBucket(row) !== experience) return false
      if (place === 'philippines' && !/philippines|manila|cebu|davao/i.test(`${row.city} ${row.country}`)) return false
      if (place === 'remote' && !(row.remoteWorldwide || row.workModes.includes('remote'))) return false
      if (availability !== 'all' && row.availability !== availability) return false
      if (skill && !row.skills.some((item) => item.toLowerCase().includes(skill))) return false
      if (payMin > 0 && (row.salaryDesired || row.salaryMin) < payMin) return false
      return true
    })
    if (tab === 'recommended') rows = rows.filter((row) => (row.matchScore ?? 0) >= 70)
    if (tab === 'saved') rows = rows.filter((row) => saved.includes(row.id))
    rows = [...rows].sort((a, b) => {
      if (sort === 'pay') return (b.salaryDesired || b.salaryMin) - (a.salaryDesired || a.salaryMin)
      if (sort === 'recent') return (b.yearsExperience || 0) - (a.yearsExperience || 0)
      return (b.matchScore ?? 0) - (a.matchScore ?? 0) || a.name.localeCompare(b.name)
    })
    return rows
  }, [desk.data, query, category, experience, place, availability, skillFilter, payMin, tab, saved, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const selected = people.find((row) => row.id === selectedId) ?? null

  const invite = useMutation({
    mutationFn: ({ id, jobId }: { id: string; jobId: string }) =>
      api<{ invite: TalentInvite; already?: boolean }>(`/api/employer/candidates/${encodeURIComponent(id)}/invite`, {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['employer-candidates'] })
      setInviteNote(res.already ? 'Already invited to this role.' : 'Invite sent. They can review the job and apply if they want.')
    },
    onError: (err) => {
      setInviteNote(err instanceof Error ? err.message : 'Could not send the invite.')
    },
  })

  function setSearch(value: string) {
    const cur = new URLSearchParams(params)
    if (value.trim()) cur.set('q', value)
    else cur.delete('q')
    setParams(cur, { replace: true })
    setPage(0)
  }

  function setTab(next: DeskTab) {
    const cur = new URLSearchParams(params)
    if (next === 'search') cur.delete('tab')
    else cur.set('tab', next)
    cur.delete('id')
    setParams(cur, { replace: true })
    setPage(0)
  }

  function openPerson(id: string) {
    const cur = new URLSearchParams(params)
    cur.set('id', id)
    setParams(cur, { replace: true })
  }

  function closePerson() {
    const cur = new URLSearchParams(params)
    cur.delete('id')
    setParams(cur, { replace: true })
  }

  function toggleSaved(id: string) {
    setSaved((cur) => {
      const next = cur.includes(id) ? cur.filter((row) => row !== id) : [id, ...cur]
      writeSaved(next)
      return next
    })
  }

  function clearFilters() {
    setSearch('')
    setCategory('all')
    setExperience('all')
    setPlace('all')
    setAvailability('all')
    setSkillFilter('')
    setPayMin(0)
    setPage(0)
  }

  function startInvite(person: TalentCard) {
    setInviteFor(person)
    setInviteJobId(openJobs[0]?.id ?? '')
    setInviteNote('')
  }

  const visibleSkills = skillsOpen ? skillCounts : skillCounts.slice(0, 6)

  return (
    <>
      <div className="space-y-4">
        {tab === 'invites' ? (
          <InviteHistory invites={invites} people={people} onOpen={openPerson} />
        ) : (
          <>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Find Candidates
            </p>
            <section className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,20rem)]">
              <div>
                <h1 className="font-serif text-[1.85rem] leading-[1.12] text-[var(--forest)] sm:text-[2.15rem]">
                  Discover great talent for your team
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4d5a54]">
                  Search, filter, and connect with skilled professionals. Find the right candidates and build your dream
                  team faster.
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm text-[var(--forest)] sm:grid-cols-4">
                  <HeroPoint icon={ShieldCheck} label="Verified Profiles" hint="Real people, real skills" />
                  <HeroPoint icon={Search} label="Advanced Search" hint="Find the perfect match" />
                  <HeroPoint icon={Globe} label="Global Talent" hint="Hire anywhere" />
                  <HeroPoint icon={Sparkles} label="AI Recommendations" hint="Get AI-powered suggestions" />
                </ul>
                <Button className="mt-4 h-9 rounded-full bg-[#13261f] hover:bg-[#0d1b16] lg:hidden" asChild>
                  <Link to="/employer/jobs/new">Post a Job</Link>
                </Button>
              </div>
              <div className="relative hidden h-[14rem] overflow-hidden rounded-2xl sm:block lg:h-[15.5rem]">
                <img
                  src={localBrandPath('employer-hero.jpg', 'employer')}
                  alt=""
                  className="h-full w-full object-cover object-[center_18%]"
                />
                <p className="pointer-events-none absolute left-3 top-[38%] max-w-[8.25rem] font-serif text-[1.05rem] italic leading-tight text-[var(--forest)] drop-shadow-[0_1px_8px_rgba(255,255,255,0.9)]">
                  Great hiring builds great teams.
                </p>
                <div className="absolute bottom-3 right-3 w-[12rem] rounded-2xl bg-white p-3 shadow-[0_12px_28px_rgba(19,38,31,0.14)]">
                  <p className="text-xs leading-relaxed text-[var(--forest)]">
                    Post a job or hire directly from top candidates.
                  </p>
                  <Button className="mt-2 h-8 w-full rounded-full bg-[#13261f] text-xs hover:bg-[#0d1b16]" asChild>
                    <Link to="/employer/jobs/new">Post a Job</Link>
                  </Button>
                </div>
              </div>
            </section>

            <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#e4ebe6] px-1">
              {(
                [
                  ['search', 'Talent Search'],
                  ['recommended', 'Recommended (AI)'],
                  ['saved', 'Saved Candidates'],
                  ['invites', 'Invite History'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    'shrink-0 border-b-2 px-3 py-2.5 text-sm',
                    tab === id
                      ? 'border-[#147a48] font-medium text-[var(--forest)]'
                      : 'border-transparent text-muted-foreground hover:text-[var(--forest)]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative min-w-[14rem] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, skill, or keyword"
                      className="h-10 rounded-full border-[#e4ebe6] bg-white pl-9"
                    />
                  </label>
                  <div className="hidden flex-wrap gap-2 lg:flex">
                    <FilterSelect
                      value={category}
                      onChange={(value) => {
                        setCategory(value)
                        setPage(0)
                      }}
                      options={[['all', 'All Categories'], ...CATEGORIES.map((item) => [item, item] as const)]}
                    />
                    <FilterSelect
                      value={experience}
                      onChange={(value) => {
                        setExperience(value as ExperienceFilter)
                        setPage(0)
                      }}
                      options={[
                        ['all', 'Experience Level'],
                        ['entry', 'Entry'],
                        ['intermediate', 'Intermediate'],
                        ['expert', 'Expert'],
                      ]}
                    />
                    <FilterSelect
                      value={place}
                      onChange={(value) => {
                        setPlace(value as LocationFilter)
                        setPage(0)
                      }}
                      options={[
                        ['all', 'Location'],
                        ['philippines', 'Philippines'],
                        ['remote', 'Remote'],
                      ]}
                    />
                    <FilterSelect
                      value={availability}
                      onChange={(value) => {
                        setAvailability(value as AvailabilityFilter)
                        setPage(0)
                      }}
                      options={[
                        ['all', 'Availability'],
                        ['now', 'Available Now'],
                        ['open', 'Open to Opportunities'],
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-1.5 px-2 text-sm text-[var(--forest)] xl:hidden"
                    onClick={() => setFiltersOpen((v) => !v)}
                  >
                    <SlidersHorizontal className="size-4" />
                    More Filters
                  </button>
                  <button
                    type="button"
                    className="hidden h-10 items-center gap-1.5 px-2 text-sm text-[var(--forest)] xl:inline-flex"
                    onClick={() =>
                      document.getElementById('candidate-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  >
                    <SlidersHorizontal className="size-4" />
                    More Filters
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-[var(--forest)]">{filtered.length.toLocaleString()}</span>{' '}
                    candidates found
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      Sort by:
                      <select
                        className="h-9 rounded-lg border border-[#e4ebe6] bg-white px-2 text-sm text-[var(--forest)]"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                      >
                        <option value="match">Best Match</option>
                        <option value="recent">Experience</option>
                        <option value="pay">Expected pay</option>
                      </select>
                    </label>
                    <div className="flex rounded-lg border border-[#e4ebe6] p-0.5">
                      <button
                        type="button"
                        aria-label="Grid view"
                        className={cn('grid size-8 place-items-center rounded-md', view === 'grid' && 'bg-[#e8f3ec] text-[#147a48]')}
                        onClick={() => setView('grid')}
                      >
                        <Grid2x2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="List view"
                        className={cn('grid size-8 place-items-center rounded-md', view === 'list' && 'bg-[#e8f3ec] text-[#147a48]')}
                        onClick={() => setView('list')}
                      >
                        <LayoutList className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {desk.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading candidates…</p>
                ) : slice.length ? (
                  <ul className={cn(view === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>
                    {slice.map((person) => (
                      <li key={person.id}>
                        <CandidateCard
                          person={person}
                          saved={saved.includes(person.id)}
                          compact={view === 'list'}
                          onOpen={() => openPerson(person.id)}
                          onSave={() => toggleSaved(person.id)}
                          onInvite={() => startInvite(person)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d7ddd8] bg-white px-6 py-16 text-center">
                    <p className="font-serif text-2xl text-[var(--forest)]">
                      {tab === 'saved'
                        ? 'No saved candidates yet'
                        : tab === 'recommended'
                          ? 'No AI matches yet'
                          : 'No candidates found'}
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      {tab === 'recommended'
                        ? 'Post an open role so we can rank people against the skills you need.'
                        : tab === 'saved'
                          ? 'Bookmark someone from Talent Search to keep them here.'
                          : 'Try another filter, or post a job so more people can be matched to you.'}
                    </p>
                    {tab !== 'saved' ? (
                      <Button className="mt-4 rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" asChild>
                        <Link to="/employer/jobs/new">Post a Job</Link>
                      </Button>
                    ) : null}
                  </div>
                )}

                {pages > 1 ? (
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: pages }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={cn(
                          'grid size-9 place-items-center rounded-full text-sm',
                          i === page ? 'bg-[#147a48] text-white' : 'border border-[#e4ebe6] text-[var(--forest)]',
                        )}
                        onClick={() => setPage(i)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <aside
                id="candidate-filters"
                className={cn(
                  'space-y-4 rounded-2xl border border-[#e4ebe6] bg-white p-4 shadow-[0_10px_28px_rgba(19,38,31,0.04)] xl:sticky xl:top-24',
                  filtersOpen ? 'block' : 'hidden xl:block',
                )}
              >
            <div className="flex items-center justify-between">
              <p className="font-medium text-[var(--forest)]">Filters</p>
              <button type="button" className="text-sm text-[#147a48] hover:underline" onClick={clearFilters}>
                Clear All
              </button>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--forest)]">Keyword</span>
              <Input
                value={query}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills, keywords"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--forest)]">Category</span>
              <select
                className="h-10 w-full rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setPage(0)
                }}
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm text-[var(--forest)]">Skills</legend>
              {visibleSkills.length ? (
                <>
                  {visibleSkills.map(([skill, count]) => (
                    <label key={skill} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={skillFilter.toLowerCase() === skill.toLowerCase()}
                        onChange={() => {
                          setSkillFilter((cur) => (cur.toLowerCase() === skill.toLowerCase() ? '' : skill))
                          setPage(0)
                        }}
                      />
                      <span className="flex-1 text-[var(--forest)]">{skill}</span>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </label>
                  ))}
                  {skillCounts.length > 6 ? (
                    <button
                      type="button"
                      className="text-sm text-[#147a48] hover:underline"
                      onClick={() => setSkillsOpen((v) => !v)}
                    >
                      {skillsOpen ? 'see less' : 'see more'}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Skills appear as candidates join.</p>
              )}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm text-[var(--forest)]">Experience Level</legend>
              {(
                [
                  ['entry', 'Entry', experienceCounts.entry],
                  ['intermediate', 'Intermediate', experienceCounts.intermediate],
                  ['expert', 'Expert', experienceCounts.expert],
                ] as const
              ).map(([id, label, count]) => (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="exp"
                    checked={experience === id}
                    onChange={() => {
                      setExperience(id)
                      setPage(0)
                    }}
                  />
                  <span className="flex-1 text-[var(--forest)]">{label}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </label>
              ))}
            </fieldset>
            <label className="block space-y-2">
              <span className="flex items-center justify-between text-sm text-[var(--forest)]">
                Expected pay
                <span className="text-xs text-muted-foreground">
                  {payMin ? `${money(payMin)}+` : `${money(payBounds.min)}–${money(payBounds.max)}`}
                </span>
              </span>
              <input
                type="range"
                min={payBounds.min}
                max={payBounds.max}
                step={1000}
                value={payMin || payBounds.min}
                onChange={(e) => {
                  setPayMin(Number(e.target.value))
                  setPage(0)
                }}
                className="w-full accent-[#147a48]"
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm text-[var(--forest)]">Location</legend>
              {(
                [
                  ['philippines', 'Philippines', locationCounts.philippines],
                  ['remote', 'Remote Only', locationCounts.remote],
                ] as const
              ).map(([id, label, count]) => (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={place === id}
                    onChange={() => {
                      setPlace((cur) => (cur === id ? 'all' : id))
                      setPage(0)
                    }}
                  />
                  <span className="flex-1 text-[var(--forest)]">{label}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm text-[var(--forest)]">Availability</legend>
              {(
                [
                  ['now', 'Available Now', availabilityCounts.now],
                  ['open', 'Open to Opportunities', availabilityCounts.open],
                ] as const
              ).map(([id, label, count]) => (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={availability === id}
                    onChange={() => {
                      setAvailability((cur) => (cur === id ? 'all' : id))
                      setPage(0)
                    }}
                  />
                  <span className="flex-1 text-[var(--forest)]">{label}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </label>
              ))}
            </fieldset>
            <Button
              type="button"
              className="w-full rounded-full bg-[#13261f] hover:bg-[#0d1b16]"
              onClick={() => setPage(0)}
            >
              Apply Filters
            </Button>
              </aside>
            </div>
          </>
        )}
      </div>

      {selected ? (
        <ProfileDrawer
          person={selected}
          saved={saved.includes(selected.id)}
          onClose={closePerson}
          onSave={() => toggleSaved(selected.id)}
          onInvite={() => startInvite(selected)}
        />
      ) : null}

      {inviteFor ? (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-[#13261f]/45 p-4"
          onClick={() => !invite.isPending && setInviteFor(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#e4ebe6] bg-white p-5 shadow-[0_20px_50px_rgba(19,38,31,0.18)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="font-serif text-2xl text-[var(--forest)]">Invite to apply</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {inviteFor.name} will get a notice to review the role. Nothing is sent as an application until they
              approve.
            </p>
            {openJobs.length ? (
              <label className="mt-4 block space-y-1.5">
                <span className="text-sm text-[var(--forest)]">Job</span>
                <select
                  className="h-10 w-full rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm"
                  value={inviteJobId}
                  onChange={(e) => setInviteJobId(e.target.value)}
                >
                  {openJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-4 text-sm text-[#8f4326]">Post an open job first, then invite people to it.</p>
            )}
            {inviteNote ? <p className="mt-3 text-sm text-[#147a48]">{inviteNote}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setInviteFor(null)}>
                Close
              </Button>
              {openJobs.length ? (
                <Button
                  type="button"
                  className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]"
                  disabled={invite.isPending || !inviteJobId}
                  onClick={() => invite.mutate({ id: inviteFor.id, jobId: inviteJobId })}
                >
                  {invite.isPending ? 'Sending…' : 'Send invite'}
                </Button>
              ) : (
                <Button className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" asChild>
                  <Link to="/employer/jobs/new">Post a Job</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function HeroPoint({ icon: Icon, label, hint }: { icon: typeof Search; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#147a48]" />
      <span>
        <span className="block font-medium leading-tight">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </li>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly (readonly [string, string])[]
}) {
  return (
    <select
      className="h-10 rounded-full border border-[#e4ebe6] bg-white px-3 text-sm text-[var(--forest)]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(([id, label]) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </select>
  )
}

function CandidateCard({
  person,
  saved,
  compact,
  onOpen,
  onSave,
  onInvite,
}: {
  person: TalentCard
  saved: boolean
  compact?: boolean
  onOpen: () => void
  onSave: () => void
  onInvite: () => void
}) {
  const pay = person.salaryDesired || person.salaryMin
  return (
    <article
      className={cn(
        'relative rounded-2xl border border-[#e4ebe6] bg-white p-4 pt-5 shadow-[0_8px_20px_rgba(19,38,31,0.04)]',
        compact && 'flex flex-wrap items-start gap-4',
      )}
    >
      <div className="absolute right-3 top-3 flex items-center gap-1">
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium',
            person.availability === 'now' ? 'bg-[#e8f3ec] text-[#147a48]' : 'bg-[#eef3f0] text-muted-foreground',
          )}
        >
          {availabilityLabel(person.availability)}
        </span>
        <button
          type="button"
          aria-label={saved ? 'Unsave' : 'Save'}
          className="grid size-8 place-items-center rounded-full text-[#147a48] hover:bg-[#e8f3ec]"
          onClick={onSave}
        >
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </button>
      </div>
      <div className={cn('flex items-start gap-3', compact && 'min-w-0 flex-1')}>
        <Avatar person={person} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 pr-28 font-medium text-[var(--forest)]">
            <span className="truncate">{person.name}</span>
            {person.verified ? <BadgeCheck className="size-4 shrink-0 text-[#2f6fed]" /> : null}
          </p>
          <p className="truncate text-sm text-muted-foreground">{person.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {person.location || 'Location not set'}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-sm">
            {person.matchScore != null ? (
              <span className="text-xs text-[#3b6fd8]">{person.matchScore}% match</span>
            ) : (
              <span />
            )}
            {pay > 0 ? <span className="font-medium text-[var(--forest)]">{money(pay, person.currency)}</span> : null}
          </div>
        </div>
      </div>
      <div className={cn('mt-3', compact && 'mt-0 w-full')}>
        <div className="flex flex-wrap gap-1.5">
          {person.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-full bg-[#eef3f0] px-2 py-0.5 text-xs text-[var(--forest)]">
              {skill}
            </span>
          ))}
        </div>
        {person.bio ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{textSnippet(person.bio, 120)}</p> : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="h-9 flex-1 rounded-full" onClick={onOpen}>
            View Profile
          </Button>
          <Button type="button" className="h-9 flex-1 rounded-full bg-[#13261f] hover:bg-[#0d1b16]" onClick={onInvite}>
            Invite to Apply
          </Button>
        </div>
      </div>
    </article>
  )
}

function Avatar({ person, large }: { person: TalentCard; large?: boolean }) {
  const size = large ? 'size-16' : 'size-12'
  if (person.avatarUrl) {
    return <img src={person.avatarUrl} alt="" className={cn(size, 'shrink-0 rounded-full object-cover')} />
  }
  return (
    <span className={cn(size, 'grid shrink-0 place-items-center rounded-full bg-[#e8f3ec] font-serif text-[var(--forest)]')}>
      {initials(person.name)}
    </span>
  )
}

function ProfileDrawer({
  person,
  saved,
  onClose,
  onSave,
  onInvite,
}: {
  person: TalentCard
  saved: boolean
  onClose: () => void
  onSave: () => void
  onInvite: () => void
}) {
  return (
    <div className="fixed inset-0 z-[110] bg-[#13261f]/40" onClick={onClose}>
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e4ebe6] p-5">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar person={person} large />
            <div className="min-w-0">
              <p className="flex items-center gap-1 font-serif text-2xl text-[var(--forest)]">
                <span className="truncate">{person.name}</span>
                {person.verified ? <BadgeCheck className="size-5 text-[#147a48]" /> : null}
              </p>
              <p className="text-sm text-muted-foreground">{person.headline}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {person.location || 'Location not set'}
              </p>
            </div>
          </div>
          <button type="button" aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-[#eef3f0]" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-[#e8f3ec] px-2.5 py-1 text-[#147a48]">{availabilityLabel(person.availability)}</span>
            <span className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-[var(--forest)]">{levelLabel(person)}</span>
            {person.yearsExperience ? (
              <span className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-[var(--forest)]">{person.yearsExperience} yrs</span>
            ) : null}
            {person.matchScore != null ? (
              <span className="rounded-full bg-[#eaf2ff] px-2.5 py-1 text-[#3b6fd8]">{person.matchScore}% match</span>
            ) : null}
          </div>
          {person.matchJobTitle ? (
            <p className="text-sm text-muted-foreground">
              Best fit for <span className="text-[var(--forest)]">{person.matchJobTitle}</span>
            </p>
          ) : null}
          {person.bio ? <p className="text-sm leading-relaxed text-[var(--forest)]">{person.bio}</p> : null}
          <div>
            <p className="text-sm font-medium text-[var(--forest)]">Skills</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {person.skills.length ? (
                person.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-xs text-[var(--forest)]">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed yet.</p>
              )}
            </div>
          </div>
          {(person.salaryDesired || person.salaryMin) > 0 ? (
            <p className="text-sm text-muted-foreground">
              Expected pay {money(person.salaryDesired || person.salaryMin, person.currency)}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2 border-t border-[#e4ebe6] p-5">
          <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onSave}>
            {saved ? 'Saved' : 'Save'}
          </Button>
          <Button type="button" className="flex-1 rounded-full bg-[#13261f] hover:bg-[#0d1b16]" onClick={onInvite}>
            Invite to Apply
          </Button>
        </div>
      </aside>
    </div>
  )
}

function InviteHistory({
  invites,
  people,
  onOpen,
}: {
  invites: TalentInvite[]
  people: TalentCard[]
  onOpen: (id: string) => void
}) {
  if (!invites.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d7ddd8] bg-white px-6 py-16 text-center">
        <p className="font-serif text-2xl text-[var(--forest)]">No invites yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Invite someone from Talent Search. They choose whether to apply.</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-[#eef3f0] rounded-2xl border border-[#e4ebe6] bg-white">
      {invites.map((row) => {
        const person = people.find((item) => item.id === row.candidateId)
        return (
          <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Briefcase className="size-4 text-[#147a48]" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[var(--forest)]">{row.candidateName}</p>
              <p className="text-sm text-muted-foreground">Invited to {row.jobTitle}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
            {person ? (
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => onOpen(person.id)}>
                View
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
