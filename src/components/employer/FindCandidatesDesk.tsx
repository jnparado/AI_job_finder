import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeCheck,
  Briefcase,
  Check,
  Clock,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { isOpenListing } from '@shared/engine/jobFields'
import type { CareerLevel, Currency, Job } from '@shared/types'
import { api } from '@/lib/api'
import { cn, initials, money, textSnippet } from '@/lib/utils'
import { InviteToJobDialog, type InviteCandidate } from '@/components/employer/InviteToJobDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SAVED_KEY = 'atelier-employer-saved-candidates'
const PAGE = 9

type DeskTab = 'search' | 'recommended' | 'saved'
type ExperienceFilter = 'all' | 'entry' | 'intermediate' | 'expert'
type LocationFilter = 'all' | 'philippines' | 'remote'
type SortKey = 'match' | 'recent' | 'pay'

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

function levelLabel(person: TalentCard) {
  if (person.careerLevel === 'junior') return 'Entry'
  if (person.careerLevel === 'mid') return 'Intermediate'
  if (person.careerLevel === 'senior') return 'Senior'
  if (person.careerLevel === 'lead') return 'Lead'
  if (person.careerLevel === 'manager') return 'Manager'
  return experienceBucket(person) === 'entry' ? 'Entry' : experienceBucket(person) === 'expert' ? 'Expert' : 'Intermediate'
}

function availabilityLabel(value: TalentCard['availability']) {
  return value === 'now' ? 'Available now' : 'Open to opportunities'
}

function hourlyLabel(person: TalentCard) {
  const pay = person.salaryDesired || person.salaryMin
  if (!pay) return null
  const hourly = Math.max(1, Math.round(pay / 2080))
  return `${money(hourly, person.currency)}/hr`
}

export function FindCandidatesDesk() {
  const [params, setParams] = useSearchParams()
  const tab = (['search', 'recommended', 'saved'].includes(params.get('tab') ?? '')
    ? params.get('tab')
    : 'search') as DeskTab
  const selectedId = params.get('id') ?? ''
  const query = params.get('q') ?? ''
  const [experience, setExperience] = useState<ExperienceFilter>('all')
  const [place, setPlace] = useState<LocationFilter>('all')
  const [skillFilter, setSkillFilter] = useState('')
  const [skillSearch, setSkillSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [hourlyMin, setHourlyMin] = useState(0)
  const [sort, setSort] = useState<SortKey>('match')
  const [page, setPage] = useState(0)
  const [saved, setSaved] = useState<string[]>(readSaved)
  const [inviteFor, setInviteFor] = useState<InviteCandidate | null>(null)
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
  const openJobs = (jobs.data ?? []).filter(isOpenListing)

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

  const filtered = useMemo(() => {
    const list = desk.data?.people ?? []
    const q = query.trim().toLowerCase()
    const skill = skillFilter.trim().toLowerCase()
    let rows = list.filter((row) => {
      if (q) {
        const hay = [row.name, row.headline, row.title, row.location, row.bio, ...row.skills].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (experience !== 'all' && experienceBucket(row) !== experience) return false
      if (place === 'philippines' && !/philippines|manila|cebu|davao/i.test(`${row.city} ${row.country}`)) return false
      if (place === 'remote' && !(row.remoteWorldwide || row.workModes.includes('remote'))) return false
      if (skill && !row.skills.some((item) => item.toLowerCase().includes(skill))) return false
      if (locationSearch.trim()) {
        const loc = locationSearch.trim().toLowerCase()
        if (!`${row.city} ${row.country} ${row.location}`.toLowerCase().includes(loc)) return false
      }
      if (hourlyMin > 0) {
        const pay = row.salaryDesired || row.salaryMin
        const hourly = pay > 0 ? Math.round(pay / 2080) : 0
        if (hourly < hourlyMin) return false
      }
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
  }, [desk.data, query, experience, place, skillFilter, locationSearch, hourlyMin, tab, saved, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const selected = people.find((row) => row.id === selectedId) ?? null

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
    setExperience('all')
    setPlace('all')
    setSkillFilter('')
    setSkillSearch('')
    setLocationSearch('')
    setHourlyMin(0)
    setPage(0)
  }

  function startInvite(person: TalentCard) {
    setInviteFor({
      id: person.id,
      name: person.name,
      matchJobTitle: person.matchJobTitle,
    })
  }

  const filteredSkillCounts = useMemo(() => {
    const q = skillSearch.trim().toLowerCase()
    if (!q) return skillCounts
    return skillCounts.filter(([skill]) => skill.toLowerCase().includes(q))
  }, [skillCounts, skillSearch])

  const visibleSkills = skillsOpen ? filteredSkillCounts : filteredSkillCounts.slice(0, 6)

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.65rem] font-semibold leading-tight text-[var(--forest)] sm:text-[1.85rem]">
              Find Candidates
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Search, filter, and connect with skilled professionals. Find the right candidates and build your dream
              team faster.
            </p>
          </div>
          <Button
            className="h-10 shrink-0 rounded-lg bg-[#13261f] px-5 !text-white hover:bg-[#0d1b16]"
            asChild
          >
            <Link to="/employer/jobs/new">Post a Job</Link>
          </Button>
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#e4ebe6] px-1">
          {(
            [
              ['search', 'Search'],
              ['recommended', 'AI Match'],
              ['saved', 'Saved Candidates'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors',
                tab === id
                  ? 'border-[#147a48] font-medium text-[var(--forest)]'
                  : 'border-transparent text-muted-foreground hover:text-[var(--forest)]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm text-[var(--forest)] lg:hidden"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="size-4" />
          {filtersOpen ? 'Hide filters' : 'Show filters'}
        </button>

        <div className="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
          <aside
            id="candidate-filters"
            className={cn(
              'space-y-5 rounded-xl border border-[#e4ebe6] bg-white p-4 shadow-[0_8px_24px_rgba(19,38,31,0.04)] lg:sticky lg:top-24',
              filtersOpen ? 'block' : 'hidden lg:block',
            )}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-[var(--forest)]">Filters</p>
              <button type="button" className="text-sm text-[#147a48] hover:underline" onClick={clearFilters}>
                Clear all
              </button>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Search skills..."
                className="h-9 border-[#e4ebe6] pl-9 text-sm"
              />
            </label>

            <fieldset className="space-y-2.5">
              <legend className="mb-1 text-sm font-medium text-[var(--forest)]">Skills</legend>
              {visibleSkills.length ? (
                <>
                  {visibleSkills.map(([skill, count]) => (
                    <label key={skill} className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-[#d7ddd8] accent-[#147a48]"
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
                  {filteredSkillCounts.length > 6 ? (
                    <button
                      type="button"
                      className="text-sm text-[#147a48] hover:underline"
                      onClick={() => setSkillsOpen((v) => !v)}
                    >
                      {skillsOpen ? 'Show less' : 'Show more'}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Skills appear as candidates join.</p>
              )}
            </fieldset>

            <fieldset className="space-y-2.5">
              <legend className="mb-1 text-sm font-medium text-[var(--forest)]">Experience Level</legend>
              {(
                [
                  ['entry', 'Entry Level', experienceCounts.entry],
                  ['intermediate', 'Intermediate', experienceCounts.intermediate],
                  ['expert', 'Expert', experienceCounts.expert],
                ] as const
              ).map(([id, label, count]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-[#d7ddd8] accent-[#147a48]"
                    checked={experience === id}
                    onChange={() => {
                      setExperience((cur) => (cur === id ? 'all' : id))
                      setPage(0)
                    }}
                  />
                  <span className="flex-1 text-[var(--forest)]">{label}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2.5">
              <legend className="mb-1 text-sm font-medium text-[var(--forest)]">Location</legend>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value)
                    setPage(0)
                  }}
                  placeholder="Search location..."
                  className="h-9 border-[#e4ebe6] pl-9 text-sm"
                />
              </label>
              {(
                [
                  ['philippines', 'Philippines', locationCounts.philippines],
                  ['remote', 'Remote Only', locationCounts.remote],
                ] as const
              ).map(([id, label, count]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-[#d7ddd8] accent-[#147a48]"
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

            <label className="block space-y-2">
              <span className="flex items-center justify-between text-sm font-medium text-[var(--forest)]">
                Hourly Rate
                <span className="text-xs font-normal text-muted-foreground">
                  {hourlyMin > 0 ? `$${hourlyMin}+/hr` : '$0 – $200+/hr'}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={200}
                step={5}
                value={hourlyMin}
                onChange={(e) => {
                  setHourlyMin(Number(e.target.value))
                  setPage(0)
                }}
                className="w-full accent-[#147a48]"
              />
              <div className="flex justify-between text-[0.65rem] text-muted-foreground">
                <span>$0</span>
                <span>$200+</span>
              </div>
            </label>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-[var(--forest)]">{filtered.length.toLocaleString()}</span> candidates
                found
              </p>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Sort by:
                <select
                  className="h-9 rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm text-[var(--forest)]"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="match">Best Match</option>
                  <option value="recent">Experience</option>
                  <option value="pay">Expected pay</option>
                </select>
              </label>
            </div>

            {desk.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading candidates…</p>
            ) : slice.length ? (
              <ul className="space-y-3">
                {slice.map((person) => {
                  const personInvites = invites.filter((row) => row.candidateId === person.id)
                  const allJobsInvited =
                    openJobs.length > 0 &&
                    openJobs.every((job) => personInvites.some((row) => row.jobId === job.id))
                  return (
                    <li key={person.id}>
                      <CandidateCard
                        person={person}
                        saved={saved.includes(person.id)}
                        invites={personInvites}
                        allJobsInvited={allJobsInvited}
                        onOpen={() => openPerson(person.id)}
                        onSave={() => toggleSaved(person.id)}
                        onInvite={() => startInvite(person)}
                      />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d7ddd8] bg-white px-6 py-16 text-center">
                <p className="text-xl font-semibold text-[var(--forest)] sm:text-2xl">
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
                      ? 'Save someone from Search to keep them here.'
                      : 'Try another filter, or post a job so more people can be matched to you.'}
                </p>
                {tab !== 'saved' ? (
                  <Button className="mt-4 rounded-lg bg-[#147a48] !text-white hover:bg-[#0f5e37]" asChild>
                    <Link to="/employer/jobs/new">Post a Job</Link>
                  </Button>
                ) : null}
              </div>
            )}

            {pages > 1 ? (
              <div className="flex justify-center gap-2 pt-2">
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

            {invites.length ? (
              <section className="pt-2">
                <h2 className="mb-3 text-sm font-medium text-[var(--forest)]">Recent invites</h2>
                <InviteHistory invites={invites.slice(0, 5)} people={people} onOpen={openPerson} />
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {selected ? (
        <ProfileDrawer
          person={selected}
          saved={saved.includes(selected.id)}
          invites={invites.filter((row) => row.candidateId === selected.id)}
          allJobsInvited={
            openJobs.length > 0 &&
            openJobs.every((job) =>
              invites.some((row) => row.candidateId === selected.id && row.jobId === job.id),
            )
          }
          onClose={closePerson}
          onSave={() => toggleSaved(selected.id)}
          onInvite={() => startInvite(selected)}
        />
      ) : null}

      <InviteToJobDialog
        person={inviteFor}
        jobs={openJobs}
        invites={invites}
        jobsLoading={jobs.isLoading}
        onClose={() => setInviteFor(null)}
      />
    </>
  )
}

function CandidateCard({
  person,
  saved,
  invites,
  allJobsInvited,
  onOpen,
  onSave,
  onInvite,
}: {
  person: TalentCard
  saved: boolean
  invites: TalentInvite[]
  allJobsInvited: boolean
  onOpen: () => void
  onSave: () => void
  onInvite: () => void
}) {
  const hourly = hourlyLabel(person)
  const experienceText = person.yearsExperience > 0 ? `${person.yearsExperience}+ years` : null
  const invited = invites.length > 0
  const latestInvite = invites[0]

  return (
    <article className="rounded-xl border border-[#e4ebe6] bg-white p-4 shadow-[0_4px_16px_rgba(19,38,31,0.04)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar person={person} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-base font-semibold text-[var(--forest)]">
                <span className="truncate">{person.name}</span>
                {person.verified ? <BadgeCheck className="size-4 shrink-0 text-[#147a48]" /> : null}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {person.matchScore != null ? (
                  <span className="font-medium text-[#147a48]">{person.matchScore}% match</span>
                ) : null}
                {hourly ? <span>{hourly}</span> : null}
                {experienceText ? <span>{experienceText}</span> : null}
              </div>
            </div>
            <button
              type="button"
              aria-label={saved ? 'Unsave candidate' : 'Save candidate'}
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full border border-[#e4ebe6] transition-colors',
                saved ? 'bg-[#e8f3ec] text-[#147a48]' : 'text-muted-foreground hover:bg-[#eef3f0] hover:text-[#147a48]',
              )}
              onClick={onSave}
            >
              <Heart className={cn('size-4', saved && 'fill-current')} />
            </button>
          </div>

          <p className="mt-2 text-sm font-medium text-[var(--forest)]">{person.title}</p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {person.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                {person.location}
              </span>
            ) : null}
            <span
              className={cn(
                'inline-flex items-center gap-1',
                person.availability === 'now' ? 'text-[#147a48]' : 'text-muted-foreground',
              )}
            >
              <Clock className="size-3.5 shrink-0" />
              {availabilityLabel(person.availability)}
            </span>
            {invited ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f3ec] px-2.5 py-0.5 text-xs font-medium text-[#147a48]">
                <Check className="size-3.5 shrink-0" />
                Invited
              </span>
            ) : null}
          </div>
          {invited && latestInvite ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Invited to <span className="text-[var(--forest)]">{latestInvite.jobTitle}</span>
              {invites.length > 1 ? ` · +${invites.length - 1} more` : ''}
            </p>
          ) : null}

          {person.skills.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-[#eef3f0] px-2.5 py-1 text-xs text-[var(--forest)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}

          {person.bio ? (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {textSnippet(person.bio, 160)}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg border-[#d7ddd8] px-5 sm:min-w-[8.5rem]"
              onClick={onOpen}
            >
              View Profile
            </Button>
            {allJobsInvited ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-[#147a48] bg-[#e8f3ec] px-5 text-[#147a48] sm:min-w-[8.5rem]"
                disabled
              >
                Invited
              </Button>
            ) : (
              <Button
                type="button"
                className="h-10 rounded-lg bg-[#13261f] px-5 hover:bg-[#0d1b16] sm:min-w-[8.5rem]"
                onClick={onInvite}
              >
                {invited ? 'Invite Again' : 'Invite to Job'}
              </Button>
            )}
          </div>
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
  invites,
  allJobsInvited,
  onClose,
  onSave,
  onInvite,
}: {
  person: TalentCard
  saved: boolean
  invites: TalentInvite[]
  allJobsInvited: boolean
  onClose: () => void
  onSave: () => void
  onInvite: () => void
}) {
  const invited = invites.length > 0

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
            {invited ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f3ec] px-2.5 py-1 text-[#147a48]">
                <Check className="size-3.5" />
                Invited
              </span>
            ) : null}
          </div>
          {invited ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {invites.map((row) => (
                <li key={row.id}>
                  Invited to <span className="text-[var(--forest)]">{row.jobTitle}</span>
                </li>
              ))}
            </ul>
          ) : null}
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
          {allJobsInvited ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full border-[#147a48] bg-[#e8f3ec] text-[#147a48]"
              disabled
            >
              Invited
            </Button>
          ) : (
            <Button type="button" className="flex-1 rounded-full bg-[#13261f] hover:bg-[#0d1b16]" onClick={onInvite}>
              {invited ? 'Invite Again' : 'Invite to Job'}
            </Button>
          )}
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
