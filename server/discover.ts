import { createHash } from 'node:crypto'
import { officialApplyLinks } from '../shared/applyBoards'
import { JOB_CATALOG } from '../shared/jobs'
import { asJob, inferCurrency, inferEmployment, inferSeniority, parseSalary, postedAt } from '../shared/engine/jobFields'
import type { CandidateProfile, DiscoveryProvider, DiscoveryReport, Job, MarketSalary, OfficialBoard } from '../shared/types'

export type { DiscoveryProvider, DiscoveryReport, OfficialBoard }

const UA = 'AtelierJobAssistant/1.0 (authorized job discovery; local app)'
const TIMEOUT_MS = 10_000
const PER_SOURCE = 50

function idFor(source: string, unique: string): string {
  return `${source}-${createHash('sha1').update(unique).digest('hex').slice(0, 12)}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function str(value: unknown): string {
  return value == null ? '' : String(value)
}

function num(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function searchQuery(profile: CandidateProfile): string {
  const title = profile.desiredTitle || profile.currentTitle || profile.headline || 'software engineer'
  const skills = profile.skills.slice(0, 2).join(' ')
  return [title, skills].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function officialSearchUrls(query: string): OfficialBoard[] {
  return officialApplyLinks({ title: query })
}

export function configuredProviders() {
  return {
    remotive: true,
    remoteok: true,
    arbeitnow: true,
    themuse: true,
    himalayas: true,
    jobicy: true,
    wwr: true,
    greenhouse: true,
    catalog: true,
    jsearch: Boolean(process.env.RAPIDAPI_KEY),
    jobsApi: Boolean(process.env.RAPIDAPI_KEY),
    jobsSearch: Boolean(process.env.RAPIDAPI_KEY),
    adzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    usajobs: Boolean(process.env.USAJOBS_EMAIL),
    linkedin: Boolean(process.env.RAPIDAPI_KEY),
    indeed: Boolean(process.env.RAPIDAPI_KEY),
    xing: Boolean(process.env.RAPIDAPI_KEY),
    upwork: false,
  }
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function runProvider(name: string, fn: () => Promise<Job[]>): Promise<{ name: string; jobs: Job[]; result: DiscoveryProvider }> {
  try {
    const jobs = await fn()
    return { name, jobs, result: { name, status: 'ok', count: jobs.length } }
  } catch (err) {
    return {
      name,
      jobs: [],
      result: { name, status: 'error', count: 0, error: err instanceof Error ? err.message : 'failed' },
    }
  }
}

function publisherSource(publisher: string): string {
  const p = publisher.toLowerCase()
  if (p.includes('linkedin')) return 'linkedin'
  if (p.includes('indeed')) return 'indeed'
  if (p.includes('glassdoor')) return 'glassdoor'
  if (p.includes('ziprecruiter') || p.includes('zip_recruiter')) return 'ziprecruiter'
  if (p.includes('naukri')) return 'naukri'
  if (p.includes('bayt')) return 'bayt'
  if (p.includes('monster')) return 'monster'
  if (p.includes('dice')) return 'dice'
  return p.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jsearch'
}

async function fromRemotive(query: string): Promise<Job[]> {
  const q = encodeURIComponent(query)
  const json = asRecord(await fetchJson(`https://remotive.com/api/remote-jobs?search=${q}`))
  const rows = Array.isArray(json?.jobs) ? json.jobs : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const url = str(j.url)
    const salary = parseSalary(str(j.salary))
    return asJob({
      id: idFor('remotive', str(j.id) || url),
      source: 'remotive',
      sourceJobId: str(j.id),
      title: str(j.title),
      company: str(j.company_name),
      description: str(j.description),
      location: str(j.candidate_required_location) || 'Remote',
      remote: true,
      employmentType: inferEmployment(str(j.job_type)),
      salaryMin: salary.min,
      salaryMax: salary.max,
      skills: Array.isArray(j.tags) ? j.tags.map(str) : [],
      applicationUrl: url,
      applyChannel: 'Remotive (official listing)',
      postedAt: postedAt(j.publication_date),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

async function fromRemoteOk(): Promise<Job[]> {
  const json = await fetchJson('https://remoteok.com/api')
  const rows = Array.isArray(json) ? json.slice(1) : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const url = str(j.apply_url || j.url)
    return asJob({
      id: idFor('remoteok', str(j.id) || url),
      source: 'remoteok',
      sourceJobId: str(j.id),
      title: str(j.position || j.title),
      company: str(j.company),
      description: str(j.description),
      location: str(j.location) || 'Remote',
      remote: true,
      salaryMin: num(j.salary_min),
      salaryMax: num(j.salary_max),
      currency: inferCurrency(str(j.salary_currency)),
      skills: Array.isArray(j.tags) ? j.tags.map(str) : [],
      applicationUrl: url,
      applyChannel: 'Remote OK (official listing)',
      postedAt: postedAt(j.date),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

async function fromArbeitnow(profile: CandidateProfile): Promise<Job[]> {
  const json = asRecord(await fetchJson('https://www.arbeitnow.com/api/job-board-api'))
  const rows = Array.isArray(json?.data) ? json.data : []
  const remoteOnly = profile.workModes.includes('remote') || profile.remoteWorldwide
  return rows
    .map((row) => {
      const j = asRecord(row) ?? {}
      const url = str(j.url)
      return asJob({
        id: idFor('arbeitnow', str(j.slug) || url),
        source: 'arbeitnow',
        sourceJobId: str(j.slug),
        title: str(j.title),
        company: str(j.company_name),
        description: str(j.description),
        location: str(j.location),
        remote: Boolean(j.remote),
        employmentType: inferEmployment(Array.isArray(j.job_types) ? j.job_types.map(str).join(' ') : ''),
        skills: Array.isArray(j.tags) ? j.tags.map(str) : [],
        applicationUrl: url,
        applyChannel: 'Arbeitnow (official listing)',
        postedAt: postedAt(j.created_at),
      })
    })
    .filter((j) => j.title && j.applicationUrl && (!remoteOnly || j.remote))
    .slice(0, PER_SOURCE)
}

async function fromTheMuse(): Promise<Job[]> {
  const json = asRecord(
    await fetchJson('https://www.themuse.com/api/public/jobs?page=0&category=Software%20Engineering&descending=true'),
  )
  const rows = Array.isArray(json?.results) ? json.results : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const company = asRecord(j.company)
    const refs = asRecord(j.refs)
    const locations = Array.isArray(j.locations) ? j.locations.map((l) => str(asRecord(l)?.name)).filter(Boolean) : []
    const levels = Array.isArray(j.levels) ? j.levels.map((l) => str(asRecord(l)?.name)).join(' ') : ''
    const url = str(refs?.landing_page)
    return asJob({
      id: idFor('themuse', str(j.id) || url),
      source: 'themuse',
      sourceJobId: str(j.id),
      title: str(j.name),
      company: str(company?.name),
      description: str(j.contents),
      location: locations[0] || 'See listing',
      remote: locations.some((l) => /remote|flexible/i.test(l)),
      seniority: inferSeniority(str(j.name), levels),
      applicationUrl: url,
      applyChannel: 'The Muse (official listing)',
      postedAt: postedAt(j.publication_date),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

async function fromHimalayas(): Promise<Job[]> {
  const json = asRecord(await fetchJson('https://himalayas.app/jobs/api?limit=40'))
  const rows = Array.isArray(json?.jobs) ? json.jobs : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const url = str(j.applicationLink || j.guid)
    const restrictions = Array.isArray(j.locationRestrictions) ? j.locationRestrictions.map(str) : []
    return asJob({
      id: idFor('himalayas', url || str(j.title)),
      source: 'himalayas',
      sourceJobId: str(j.guid || j.title),
      title: str(j.title),
      company: str(j.companyName),
      description: str(j.description || j.excerpt),
      location: restrictions[0] || 'Remote',
      remote: true,
      employmentType: inferEmployment(str(j.employmentType)),
      salaryMin: num(j.minSalary),
      salaryMax: num(j.maxSalary),
      currency: inferCurrency(str(j.currency)),
      seniority: inferSeniority(str(j.title), Array.isArray(j.seniority) ? j.seniority.map(str).join(' ') : ''),
      applicationUrl: url,
      applyChannel: 'Himalayas (official listing)',
      postedAt: postedAt(j.pubDate),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

async function fromJobicy(query: string): Promise<Job[]> {
  const tag = encodeURIComponent(query.split(/\s+/)[0] || 'javascript')
  const json = asRecord(await fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=40&tag=${tag}`))
  const rows = Array.isArray(json?.jobs) ? json.jobs : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const url = str(j.url)
    const types = Array.isArray(j.jobType) ? j.jobType.map(str).join(' ') : str(j.jobType)
    return asJob({
      id: idFor('jobicy', str(j.id) || url),
      source: 'jobicy',
      sourceJobId: str(j.id),
      title: str(j.jobTitle),
      company: str(j.companyName),
      description: str(j.jobDescription || j.jobExcerpt),
      location: str(j.jobGeo) || 'Remote',
      remote: true,
      employmentType: inferEmployment(types),
      salaryMin: num(j.salaryMin),
      salaryMax: num(j.salaryMax),
      currency: inferCurrency(str(j.salaryCurrency)),
      seniority: inferSeniority(str(j.jobTitle), str(j.jobLevel)),
      applicationUrl: url,
      applyChannel: 'Jobicy (official listing)',
      postedAt: postedAt(j.pubDate),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

const JOBS_API_HOST = 'jobs-api14.p.rapidapi.com'

function jobsApiHeaders(): Record<string, string> {
  return {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY ?? '',
    'X-RapidAPI-Host': JOBS_API_HOST,
    'Content-Type': 'application/json',
  }
}

function jobsApiLocation(profile: CandidateProfile): string {
  return profile.city || profile.locations[0] || profile.country || 'United States'
}

function jobsApiCountry(profile: CandidateProfile): string {
  const t = `${profile.country} ${profile.locations.join(' ')}`.toLowerCase()
  if (/\b(uk|united kingdom|britain|england)\b/.test(t)) return 'gb'
  if (/\bcanada\b/.test(t)) return 'ca'
  if (/\baustralia\b/.test(t)) return 'au'
  if (/\b(switzerland|schweiz)\b/.test(t)) return 'ch'
  if (/\b(germany|deutschland)\b/.test(t)) return 'de'
  if (/\b(austria|österreich|osterreich)\b/.test(t)) return 'at'
  if (/\bfrance\b/.test(t)) return 'fr'
  if (/\bnetherlands\b/.test(t)) return 'nl'
  if (/\bphilippines?\b/.test(t)) return 'ph'
  if (/\bsingapore\b/.test(t)) return 'sg'
  if (/\bindia\b/.test(t)) return 'in'
  return 'us'
}

function jobsApiXingLocation(profile: CandidateProfile): string {
  const code = jobsApiCountry(profile)
  const city = profile.city.trim()
  if (city) {
    const de: Record<string, string> = { zurich: 'Zürich', zürich: 'Zürich', munich: 'München', cologne: 'Köln', vienna: 'Wien' }
    return de[city.toLowerCase()] || city
  }
  if (code === 'ch') return 'Schweiz'
  if (code === 'de') return 'Deutschland'
  if (code === 'at') return 'Österreich'
  return profile.remoteWorldwide ? 'Remote' : 'Deutschland'
}

function jobsApiExperience(profile: CandidateProfile): string {
  const map: Record<CandidateProfile['careerLevel'], string> = {
    junior: 'intern;entry;associate',
    mid: 'associate;midSenior',
    senior: 'midSenior',
    lead: 'midSenior;director',
    manager: 'director',
    executive: 'director',
  }
  return map[profile.careerLevel] || 'associate;midSenior'
}

function jobsApiXingCareer(profile: CandidateProfile): string {
  const map: Record<CandidateProfile['careerLevel'], string> = {
    junior: 'entry',
    mid: 'professional',
    senior: 'professional',
    lead: 'manager',
    manager: 'manager',
    executive: 'executive;seniorExecutive',
  }
  return map[profile.careerLevel] || 'professional'
}

function salaryFrom(value: unknown): { min?: number; max?: number; currency?: string } {
  const rec = asRecord(value)
  if (!rec) return {}
  return { min: num(rec.minimum ?? rec.min), max: num(rec.maximum ?? rec.max), currency: str(rec.currency) }
}

async function jobsApiDetail(path: string, id: string): Promise<Record<string, unknown>> {
  const detail = asRecord(await fetchJson(`https://${JOBS_API_HOST}${path}?id=${encodeURIComponent(id)}`, jobsApiHeaders()))
  return asRecord(detail?.data) ?? {}
}

function jobsApiEmployment(profile: CandidateProfile): string {
  const map: Record<string, string> = {
    'full-time': 'fulltime',
    'part-time': 'parttime',
    contract: 'contractor',
    freelance: 'contractor',
  }
  const types = profile.employmentTypes.map((t) => map[t]).filter(Boolean)
  return [...new Set(types)].join(';') || 'contractor;fulltime;parttime;temporary'
}

function jobsApiWorkplace(profile: CandidateProfile): string {
  const map: Record<string, string> = { remote: 'remote', hybrid: 'hybrid', onsite: 'onSite' }
  const types = profile.workModes.map((m) => map[m]).filter(Boolean)
  return [...new Set(types)].join(';') || 'remote;hybrid;onSite'
}

async function fromJobsApiBing(query: string, profile: CandidateProfile): Promise<Job[]> {
  if (!process.env.RAPIDAPI_KEY) return []
  const params = new URLSearchParams({
    query,
    location: jobsApiLocation(profile),
    employmentTypes: jobsApiEmployment(profile),
    remoteOnly: String(profile.workModes.includes('remote') && profile.workModes.length === 1),
    datePosted: 'week',
  })
  const json = asRecord(await fetchJson(`https://${JOBS_API_HOST}/v2/bing/search?${params}`, jobsApiHeaders()))
  const rows = Array.isArray(json?.data) ? json.data : []
  const listed = rows.slice(0, 20)
  const details = await Promise.all(
    listed.slice(0, 12).map(async (row) => {
      const j = asRecord(row) ?? {}
      const id = str(j.id)
      if (!id) return j
      try {
        return { ...j, ...(await jobsApiDetail('/v2/bing/get', id)) }
      } catch {
        return j
      }
    }),
  )
  return details.map((j) => {
    const url = str(j.applyUrl || j.url || j.jobUrl)
    const provider = str(j.jobProvider || j.provider)
    return asJob({
      id: idFor('bing', str(j.id) || url),
      source: publisherSource(provider) === 'jsearch' ? 'bing' : publisherSource(provider),
      sourceJobId: str(j.id),
      title: str(j.title),
      company: str(j.company || j.companyName),
      description: str(j.description),
      location: str(j.location) || jobsApiLocation(profile),
      remote: /remote/i.test(str(j.location)) || Boolean(j.remote),
      employmentType: inferEmployment(str(j.employmentType)),
      applicationUrl: url,
      applyChannel: `${provider || 'Bing Jobs'} listing`,
      postedAt: postedAt(j.postedTimeAgo || j.datePosted),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

async function fromJobsApiIndeed(query: string, profile: CandidateProfile): Promise<Job[]> {
  if (!process.env.RAPIDAPI_KEY) return []
  const params = new URLSearchParams({
    query,
    location: jobsApiLocation(profile),
    countryCode: jobsApiCountry(profile),
    sortType: 'relevance',
  })
  const json = asRecord(await fetchJson(`https://${JOBS_API_HOST}/v2/indeed/search?${params}`, jobsApiHeaders()))
  const rows = Array.isArray(json?.data) ? json.data : []
  const listed = rows.slice(0, PER_SOURCE)
  const details = await Promise.all(
    listed.slice(0, 12).map(async (row) => {
      const j = asRecord(row) ?? {}
      const id = str(j.id)
      if (!id || str(j.applyUrl)) return j
      try {
        return { ...j, ...(await jobsApiDetail('/v2/indeed/get', id)) }
      } catch {
        return j
      }
    }),
  )
  const rest = listed.slice(12).map((row) => asRecord(row) ?? {})
  return [...details, ...rest].map((j) => {
    const company = asRecord(j.company)
    const loc = asRecord(j.location)
    const url = str(j.applyUrl)
    return asJob({
      id: idFor('indeed', str(j.id) || url),
      source: 'indeed',
      sourceJobId: str(j.id),
      title: str(j.title),
      company: str(company?.name || j.company),
      description: str(j.description),
      location: str(loc?.location || j.location) || jobsApiLocation(profile),
      remote: /remote/i.test(`${loc?.location ?? ''} ${j.description ?? ''}`),
      applicationUrl: url,
      applyChannel: 'Indeed listing',
      postedAt:
        typeof j.datePublishedTimestamp === 'number' && j.datePublishedTimestamp > 0
          ? postedAt(j.datePublishedTimestamp)
          : undefined,
    })
  }).filter((j) => j.title && j.applicationUrl)
}

async function fromJobsApiLinkedIn(query: string, profile: CandidateProfile): Promise<Job[]> {
  if (!process.env.RAPIDAPI_KEY) return []
  const params = new URLSearchParams({
    query,
    location: profile.remoteWorldwide ? 'Worldwide' : jobsApiLocation(profile),
    datePosted: 'week',
    employmentTypes: jobsApiEmployment(profile),
    experienceLevels: jobsApiExperience(profile),
    workplaceTypes: jobsApiWorkplace(profile),
  })
  const json = asRecord(await fetchJson(`https://${JOBS_API_HOST}/v2/linkedin/search?${params}`, jobsApiHeaders()))
  const rows = Array.isArray(json?.data) ? json.data : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const url = str(j.linkedinUrl || j.applyUrl)
    return asJob({
      id: idFor('linkedin', str(j.id) || url),
      source: 'linkedin',
      sourceJobId: str(j.id),
      title: str(j.title),
      company: str(j.companyName || j.company),
      description: str(j.description),
      location: str(j.location) || jobsApiLocation(profile),
      remote: /remote/i.test(str(j.location)) || profile.workModes.includes('remote'),
      applicationUrl: url,
      applyChannel: 'LinkedIn listing',
      postedAt: postedAt(j.datePosted || j.postedTimeAgo),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

async function fromJobsApiXing(query: string, profile: CandidateProfile): Promise<Job[]> {
  if (!process.env.RAPIDAPI_KEY) return []
  const params = new URLSearchParams({
    query,
    location: jobsApiXingLocation(profile),
    datePosted: 'week',
    employmentTypes: jobsApiEmployment(profile),
    careerLevels: jobsApiXingCareer(profile),
    remoteOptions: jobsApiWorkplace(profile),
  })
  if (profile.salaryMin > 0) params.set('minimumSalary', String(Math.round(profile.salaryMin)))
  const json = asRecord(await fetchJson(`https://${JOBS_API_HOST}/v2/xing/search?${params}`, jobsApiHeaders()))
  const rows = Array.isArray(json?.data) ? json.data : []
  const listed = rows.slice(0, PER_SOURCE)
  const details = await Promise.all(
    listed.slice(0, 12).map(async (row) => {
      const j = asRecord(row) ?? {}
      const id = str(j.id)
      if (!id) return j
      try {
        return { ...j, ...(await jobsApiDetail('/v2/xing/get', id)) }
      } catch {
        return j
      }
    }),
  )
  return details.map((j) => {
    const url = str(j.applyUrl || j.url)
    const pay = salaryFrom(j.salary)
    const remoteOpts = Array.isArray(j.remoteOptions) ? j.remoteOptions.map(str).join(' ') : str(j.remoteOptions)
    return asJob({
      id: idFor('xing', str(j.id) || url),
      source: 'xing',
      sourceJobId: str(j.id),
      title: str(j.title),
      company: str(j.company),
      description: str(j.description),
      location: str(j.location) || jobsApiXingLocation(profile),
      remote: /remote/i.test(`${j.location ?? ''} ${remoteOpts}`),
      employmentType: inferEmployment(str(j.employmentType)),
      salaryMin: pay.min,
      salaryMax: pay.max,
      currency: pay.currency ? inferCurrency(pay.currency) : undefined,
      applicationUrl: url,
      applyChannel: 'Xing listing',
      postedAt: postedAt(j.dateUpdated || j.datePosted),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

async function fromJobsApiSalary(query: string, profile: CandidateProfile): Promise<MarketSalary | null> {
  if (!process.env.RAPIDAPI_KEY) return null
  const title = profile.desiredTitle || profile.currentTitle || query
  const params = new URLSearchParams({
    query: title,
    countryCode: jobsApiCountry(profile),
  })
  const json = asRecord(await fetchJson(`https://${JOBS_API_HOST}/v2/salary/range?${params}`, jobsApiHeaders()))
  const data = asRecord(json?.data)
  const yearly = asRecord(data?.yearlySalary)
  if (!data || !yearly) return null
  return {
    title,
    country: str(data.country) || profile.country,
    countryCode: str(data.countryCode) || jobsApiCountry(profile),
    currency: str(data.currency) || profile.currency,
    yearlyMin: num(yearly.min),
    yearlyMedian: num(yearly.median ?? yearly.mean),
    yearlyMax: num(yearly.max),
  }
}

function jsearchEmployment(profile: CandidateProfile): string {
  const map: Record<string, string> = {
    'full-time': 'FULLTIME',
    'part-time': 'PARTTIME',
    contract: 'CONTRACTOR',
    freelance: 'CONTRACTOR',
  }
  const types = profile.employmentTypes.map((t) => map[t]).filter(Boolean)
  return [...new Set(types)].join(',') || 'FULLTIME,CONTRACTOR,PARTTIME,INTERN'
}

async function fromJSearch(query: string, profile: CandidateProfile): Promise<Job[]> {
  const key = process.env.RAPIDAPI_KEY
  if (!key) return []
  const remote = profile.workModes.includes('remote') || profile.remoteWorldwide
  const where = profile.city || profile.country
  const phrase = [query, remote ? 'remote' : '', where && !remote ? `in ${where}` : ''].filter(Boolean).join(' ')
  const params = new URLSearchParams({
    query: phrase,
    page: '1',
    num_pages: '1',
    date_posted: 'month',
    country: jobsApiCountry(profile),
  })
  if (remote) params.set('remote_jobs_only', 'true')
  const types = jsearchEmployment(profile)
  if (types) params.set('employment_types', types)
  const json = asRecord(
    await fetchJson(`https://jsearch.p.rapidapi.com/search?${params}`, {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    }),
  )
  const rows = Array.isArray(json?.data) ? json.data : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const publisher = str(j.job_publisher) || 'JSearch'
    const source = publisherSource(publisher)
    const url = str(j.job_apply_link || j.job_google_link)
    const loc = [j.job_city, j.job_state, j.job_country].map(str).filter(Boolean).join(', ')
    return asJob({
      id: idFor(source, str(j.job_id) || url),
      source,
      sourceJobId: str(j.job_id),
      title: str(j.job_title),
      company: str(j.employer_name),
      description: str(j.job_description),
      location: loc || (j.job_is_remote ? 'Remote' : ''),
      remote: Boolean(j.job_is_remote),
      employmentType: inferEmployment(str(j.job_employment_type)),
      salaryMin: num(j.job_min_salary),
      salaryMax: num(j.job_max_salary),
      currency: inferCurrency(str(j.job_salary_currency)),
      applicationUrl: url,
      applyChannel: `${publisher} listing`,
      postedAt: postedAt(j.job_posted_at_datetime_utc),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

const JOBS_SEARCH_HOST = 'jobs-search-api.p.rapidapi.com'

function jobsSearchJobType(profile: CandidateProfile): string {
  if (profile.employmentTypes.includes('full-time')) return 'fulltime'
  if (profile.employmentTypes.includes('part-time')) return 'parttime'
  if (profile.employmentTypes.includes('contract') || profile.employmentTypes.includes('freelance')) return 'contract'
  return 'fulltime'
}

function jobsSearchCountry(profile: CandidateProfile): string {
  const map: Record<string, string> = {
    us: 'USA',
    gb: 'UK',
    ca: 'Canada',
    au: 'Australia',
    de: 'Germany',
    fr: 'France',
    nl: 'Netherlands',
    ph: 'Philippines',
    sg: 'Singapore',
    ch: 'Switzerland',
    at: 'Austria',
    in: 'India',
  }
  return map[jobsApiCountry(profile)] || 'USA'
}

function jobsSearchSites(profile: CandidateProfile): string[] {
  const sites = ['indeed', 'linkedin', 'zip_recruiter', 'glassdoor']
  const t = `${profile.country} ${profile.locations.join(' ')}`.toLowerCase()
  if (jobsApiCountry(profile) === 'in' || /\bindia\b/.test(t)) sites.push('naukri')
  if (/\b(uae|dubai|saudi|qatar|egypt|bahrain|kuwait|oman|bayt)\b/.test(t)) sites.push('bayt')
  return sites
}

function jobsSearchRows(json: unknown): unknown[] {
  if (Array.isArray(json)) return json
  const rec = asRecord(json)
  if (!rec) return []
  for (const key of ['jobs', 'data', 'results', 'job_results']) {
    if (Array.isArray(rec[key])) return rec[key] as unknown[]
  }
  const nested = asRecord(rec.data) ?? asRecord(rec.jobs)
  if (nested) {
    for (const key of ['jobs', 'data', 'results']) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[]
    }
  }
  return []
}

async function fromJobsSearchApi(query: string, profile: CandidateProfile): Promise<Job[]> {
  const key = process.env.RAPIDAPI_KEY
  if (!key) return []
  const remote = profile.workModes.includes('remote') || profile.remoteWorldwide
  const res = await fetch(`https://${JOBS_SEARCH_HOST}/getjobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': JOBS_SEARCH_HOST,
    },
    body: JSON.stringify({
      search_term: query,
      location: remote && !profile.city ? 'remote' : jobsApiLocation(profile),
      country_indeed: jobsSearchCountry(profile),
      results_wanted: 15,
      site_name: jobsSearchSites(profile),
      distance: 50,
      job_type: jobsSearchJobType(profile),
      is_remote: remote,
      linkedin_fetch_description: false,
      hours_old: 168,
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const rows = jobsSearchRows(await res.json())
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const site = str(j.site || j.site_name || j.source)
    const source = publisherSource(site)
    const url = str(j.job_url_direct || j.job_url || j.url || j.apply_url)
    const locRec = asRecord(j.location)
    const loc = locRec ? str(locRec.display || locRec.location) : str(j.location)
    const pay = parseSalary(str(j.salary || j.compensation))
    return asJob({
      id: idFor(source === 'jsearch' ? 'jobs-search' : source, str(j.id || j.job_id) || url),
      source: source === 'jsearch' ? 'jobs-search' : source,
      sourceJobId: str(j.id || j.job_id),
      title: str(j.title || j.job_title),
      company: str(j.company || j.company_name),
      description: str(j.description || j.job_description),
      location: loc || jobsApiLocation(profile),
      remote: Boolean(j.is_remote) || /remote/i.test(loc),
      employmentType: inferEmployment(str(j.job_type || j.employment_type)),
      salaryMin: num(j.min_amount ?? j.min_salary) ?? pay.min,
      salaryMax: num(j.max_amount ?? j.max_salary) ?? pay.max,
      currency: inferCurrency(str(j.currency || j.salary_currency)),
      applicationUrl: url,
      applyChannel: `${site || 'Jobs Search'} listing`,
      postedAt: postedAt(j.date_posted || j.date || j.posted_at),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

function adzunaCountry(profile: CandidateProfile): string {
  const t = `${profile.country} ${profile.locations.join(' ')}`.toLowerCase()
  if (/\b(uk|united kingdom|britain|england)\b/.test(t)) return 'gb'
  if (/\bcanada\b/.test(t)) return 'ca'
  if (/\baustralia\b/.test(t)) return 'au'
  if (/\bgermany\b/.test(t)) return 'de'
  if (/\bfrance\b/.test(t)) return 'fr'
  if (/\bnetherlands\b/.test(t)) return 'nl'
  return 'us'
}

async function fromAdzuna(query: string, profile: CandidateProfile): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []
  const country = adzunaCountry(profile)
  const where = encodeURIComponent(profile.city || (profile.remoteWorldwide ? '' : profile.country))
  const what = encodeURIComponent(query)
  const json = asRecord(
    await fetchJson(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=40&what=${what}${where ? `&where=${where}` : ''}&content-type=application/json`,
    ),
  )
  const rows = Array.isArray(json?.results) ? json.results : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const j = asRecord(row) ?? {}
    const company = asRecord(j.company)
    const location = asRecord(j.location)
    const url = str(j.redirect_url)
    return asJob({
      id: idFor('adzuna', str(j.id) || url),
      source: 'adzuna',
      sourceJobId: str(j.id),
      title: str(j.title),
      company: str(company?.display_name),
      description: str(j.description),
      location: str(location?.display_name),
      remote: /remote/i.test(`${j.title} ${j.description} ${location?.display_name}`),
      employmentType: inferEmployment(str(j.contract_time || j.contract_type)),
      salaryMin: num(j.salary_min),
      salaryMax: num(j.salary_max),
      applicationUrl: url,
      applyChannel: 'Adzuna (official listing)',
      postedAt: postedAt(j.created),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

const GREENHOUSE_BOARDS = [
  'stripe',
  'github',
  'vercel',
  'discord',
  'figma',
  'datadog',
  'cloudflare',
  'shopify',
  'airbnb',
  'gitlab',
]

function rssTag(block: string, name: string): string {
  const match = block.match(
    new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${name}>`, 'i'),
  )
  return (match?.[1] ?? match?.[2] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseRssItems(xml: string): { title: string; link: string; description: string; pubDate: string }[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => {
    const block = m[1] ?? ''
    return {
      title: rssTag(block, 'title'),
      link: rssTag(block, 'link') || rssTag(block, 'guid'),
      description: rssTag(block, 'description'),
      pubDate: rssTag(block, 'pubDate'),
    }
  })
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.text()
}

function relevantTitle(title: string, profile: CandidateProfile): boolean {
  const t = title.toLowerCase()
  const tokens = [profile.desiredTitle, profile.currentTitle, profile.headline]
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'job', 'role'].includes(w))
  if (tokens.some((w) => t.includes(w))) return true
  return profile.skills.slice(0, 8).some((s) => s.length > 2 && t.includes(s.toLowerCase()))
}

async function fromWeWorkRemotely(): Promise<Job[]> {
  const xml = await fetchText('https://weworkremotely.com/categories/remote-programming-jobs.rss')
  return parseRssItems(xml)
    .slice(0, PER_SOURCE)
    .map((item) => {
      const [company, ...rest] = item.title.split(':')
      const title = rest.join(':').trim() || item.title
      return asJob({
        id: idFor('wwr', item.link || item.title),
        source: 'wwr',
        sourceJobId: item.link,
        title,
        company: rest.length ? company.trim() : 'We Work Remotely',
        description: item.description || title,
        location: 'Remote',
        remote: true,
        applicationUrl: item.link,
        applyChannel: 'We Work Remotely (official listing)',
        postedAt: postedAt(item.pubDate),
      })
    })
    .filter((j) => j.title && j.applicationUrl)
}

async function fromGreenhouse(profile: CandidateProfile): Promise<Job[]> {
  const boards = await Promise.all(
    GREENHOUSE_BOARDS.map(async (board) => {
      try {
        const json = asRecord(await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`))
        const rows = Array.isArray(json?.jobs) ? json.jobs : []
        return rows.map((row) => {
          const j = asRecord(row) ?? {}
          const loc = asRecord(j.location)
          const url = str(j.absolute_url)
          const title = str(j.title)
          return asJob({
            id: idFor('greenhouse', str(j.id) || url),
            source: 'greenhouse',
            sourceJobId: str(j.id),
            title,
            company: board.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: title,
            location: str(loc?.name) || 'See listing',
            remote: /remote|anywhere|distributed/i.test(str(loc?.name)),
            applicationUrl: url,
            applyChannel: 'Greenhouse (authorized portal)',
            postedAt: postedAt(j.updated_at),
          })
        })
      } catch {
        return []
      }
    }),
  )
  const all = boards.flat().filter((j) => j.title && j.applicationUrl)
  const matched = all.filter((j) => relevantTitle(j.title, profile))
  return (matched.length ? matched : all).slice(0, PER_SOURCE)
}

async function fromUsaJobs(query: string): Promise<Job[]> {
  const email = process.env.USAJOBS_EMAIL
  if (!email) return []
  const json = asRecord(
    await fetchJson(`https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(query)}&ResultsPerPage=25`, {
      Host: 'data.usajobs.gov',
      'User-Agent': email,
    }),
  )
  const search = asRecord(json?.SearchResult)
  const rows = Array.isArray(search?.SearchResultItems) ? search.SearchResultItems : []
  return rows.slice(0, PER_SOURCE).map((row) => {
    const item = asRecord(asRecord(row)?.MatchedObjectDescriptor) ?? {}
    const url = str(item.PositionURI)
    const loc = Array.isArray(item.PositionLocation)
      ? str(asRecord(item.PositionLocation[0])?.LocationName)
      : ''
    const remun = asRecord(Array.isArray(item.PositionRemuneration) ? item.PositionRemuneration[0] : null)
    return asJob({
      id: idFor('usajobs', str(item.PositionID) || url),
      source: 'usajobs',
      sourceJobId: str(item.PositionID),
      title: str(item.PositionTitle),
      company: str(item.OrganizationName) || 'USAJOBS',
      description: str(asRecord(asRecord(item.UserArea)?.Details)?.JobSummary || item.QualificationSummary),
      location: loc || 'United States',
      remote: /remote|telework/i.test(`${loc} ${item.PositionTitle}`),
      salaryMin: num(remun?.MinimumRange),
      salaryMax: num(remun?.MaximumRange),
      applicationUrl: url,
      applyChannel: 'USAJOBS (official listing)',
      postedAt: postedAt(item.PublicationStartDate),
    })
  }).filter((j) => j.title && j.applicationUrl)
}

export async function discoverJobs(
  profile: CandidateProfile,
  opts?: { query?: string },
): Promise<DiscoveryReport> {
  const query = opts?.query?.trim() || searchQuery(profile)
  const catalog = JOB_CATALOG.map((job) => asJob(job))
  const tasks = [
    runProvider('Remotive', () => fromRemotive(query)),
    runProvider('Remote OK', () => fromRemoteOk()),
    runProvider('Arbeitnow', () => fromArbeitnow(profile)),
    runProvider('The Muse', () => fromTheMuse()),
    runProvider('Himalayas', () => fromHimalayas()),
    runProvider('Jobicy', () => fromJobicy(query)),
    runProvider('We Work Remotely', () => fromWeWorkRemotely()),
    runProvider('Career pages (Greenhouse)', () => fromGreenhouse(profile)),
  ]
  const salaryTask = process.env.RAPIDAPI_KEY ? fromJobsApiSalary(query, profile).catch(() => null) : Promise.resolve(null)
  if (process.env.RAPIDAPI_KEY) {
    tasks.push(runProvider('Google for Jobs (JSearch)', () => fromJSearch(query, profile)))
    tasks.push(runProvider('Bing Jobs (Jobs API)', () => fromJobsApiBing(query, profile)))
    tasks.push(runProvider('Indeed (Jobs API)', () => fromJobsApiIndeed(query, profile)))
    tasks.push(runProvider('LinkedIn (Jobs API)', () => fromJobsApiLinkedIn(query, profile)))
    tasks.push(runProvider('Xing (Jobs API)', () => fromJobsApiXing(query, profile)))
    tasks.push(runProvider('Jobs Search API', () => fromJobsSearchApi(query, profile)))
  }
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    tasks.push(runProvider('Adzuna', () => fromAdzuna(query, profile)))
  }
  if (process.env.USAJOBS_EMAIL) {
    tasks.push(runProvider('USAJOBS', () => fromUsaJobs(query)))
  }

  const [settled, marketSalary] = await Promise.all([Promise.all(tasks), salaryTask])
  const jobs = [...catalog, ...settled.flatMap((s) => s.jobs)]
  const providers: DiscoveryProvider[] = [
    { name: 'Atelier catalog', status: 'ok', count: catalog.length, note: 'Seeded roles for matching demos' },
    ...settled.map((s) => s.result),
  ]
  if (marketSalary) {
    providers.push({
      name: 'Market salary (Jobs API)',
      status: 'ok',
      count: 1,
      note: `${marketSalary.currency} ${Math.round(marketSalary.yearlyMedian ?? 0).toLocaleString()} median in ${marketSalary.country}`,
    })
  }
  if (!process.env.RAPIDAPI_KEY) {
    providers.push({
      name: 'LinkedIn / Indeed / Glassdoor / Xing',
      status: 'skipped',
      count: 0,
      note: 'Add RAPIDAPI_KEY and subscribe to JSearch, Jobs API (jobs-api14), and/or JOBS SEARCH API on RapidAPI. Until then, open the official search links.',
    })
  }
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
    providers.push({
      name: 'Adzuna',
      status: 'skipped',
      count: 0,
      note: 'Optional ADZUNA_APP_ID and ADZUNA_APP_KEY',
    })
  }
  providers.push({
    name: 'Upwork / Freelancer',
    status: 'skipped',
    count: 0,
    note: 'Those platforms do not publish a public jobs API. Open the official search links with your keywords, then apply on their site.',
  })
  if (!process.env.USAJOBS_EMAIL) {
    providers.push({
      name: 'USAJOBS',
      status: 'skipped',
      count: 0,
      note: 'Optional USAJOBS_EMAIL for the official US federal jobs API',
    })
  }

  return {
    query,
    jobs: jobs.filter((j) => j.title && j.company && j.applicationUrl),
    providers,
    officialSearch: officialSearchUrls(query),
    marketSalary: marketSalary ?? undefined,
  }
}
