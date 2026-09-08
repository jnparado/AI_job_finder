export type CareerLevel =
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'executive'

export type WorkMode = 'remote' | 'hybrid' | 'onsite'
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'freelance'
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'PHP' | 'CHF'

export type MatchCategory =
  | 'excellent'
  | 'strong'
  | 'good'
  | 'possible'
  | 'poor'

export type ApplicationStatus =
  | 'draft'
  | 'ready'
  | 'submitted'
  | 'under_review'
  | 'interview'
  | 'technical_interview'
  | 'hr_interview'
  | 'final_interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn'

export interface Job {
  id: string
  source: string
  sourceJobId?: string
  sources?: { source: string; url: string }[]
  title: string
  company: string
  description: string
  location?: string
  remote: boolean
  workMode?: WorkMode
  employmentType?: EmploymentType
  salaryMin?: number
  salaryMax?: number
  currency?: Currency
  skills: string[]
  requiredSkills?: string[]
  preferredSkills?: string[]
  requiredExperience?: number
  seniority?: CareerLevel | 'intern' | 'staff'
  applicationUrl: string
  applyChannel?: string
  postedAt?: string
  canonicalKey?: string
  employerId?: string
}

export interface ExperienceEntry {
  id: string
  title: string
  company: string
  start: string
  end: string
  current: boolean
  bullets: string[]
}

export interface ParsedResume {
  name: string
  headline: string
  experience_years: number
  skills: string[]
  ai_skills: string[]
  industries: string[]
  experience?: ExperienceEntry[]
  summary?: string
}

export interface CandidateProfile {
  id?: string
  firstName: string
  lastName: string
  email: string
  country: string
  city: string
  headline: string
  currentTitle: string
  desiredTitle: string
  yearsExperience: number
  industry: string
  careerLevel: CareerLevel
  skills: string[]
  aiSkills: string[]
  workModes: WorkMode[]
  employmentTypes: EmploymentType[]
  salaryMin: number
  salaryDesired: number
  currency: Currency
  locations: string[]
  remoteWorldwide: boolean
  careerGoals: string
  resumeText: string
  experience: ExperienceEntry[]
  onboardingCompleted: boolean
  parsedProfile?: ParsedResume | null
  role?: 'candidate' | 'employer'
  companyName?: string
  companyWebsite?: string
  avatarUrl?: string
  locale?: string
  identities?: SocialIdentity[]
  socialLinks?: Record<string, string>
}

export interface SocialIdentity {
  provider: string
  email?: string
  name?: string
  avatarUrl?: string
  connectedAt: string
}

export interface JobAnalysis {
  required_experience: number
  required_skills: string[]
  preferred_skills: string[]
  seniority: string
}

export interface MatchBreakdown {
  skills: number
  experience: number
  title: number
  salary: number
  location: number
  employment: number
  seniority: number
  careerGoals: number
}

export interface JobMatch {
  job: Job
  analysis: JobAnalysis
  score: number
  category: MatchCategory
  breakdown: MatchBreakdown
  matchedSkills: string[]
  missingSkills: string[]
  preferredMissing: string[]
  summary: string
  recommendation: string
  stars: number
  aiLane?: 'luna' | 'terra' | 'sol'
  aiNote?: string
}

export interface ScreeningAnswer {
  question: string
  answer: string
}

export interface PreparedPacket {
  tailoredResume: string
  coverLetter: string
  answers: ScreeningAnswer[]
  recruiterMessage: string
  resumeNotes: { confirmed: string[]; unconfirmed: string[] }
  aiLane?: 'luna' | 'terra' | 'sol'
}

export interface FollowUpDraft {
  dayOffset: number
  title: string
  body: string
}

export interface CareerInsights {
  headline: string
  rates: { label: string; rate: number }[]
  advice: string[]
  strategy?: string
  aiLane?: 'luna' | 'terra' | 'sol'
}

export function matchCategory(score: number): MatchCategory {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'strong'
  if (score >= 70) return 'good'
  if (score >= 60) return 'possible'
  return 'poor'
}

export function categoryLabel(cat: MatchCategory): string {
  const labels: Record<MatchCategory, string> = {
    excellent: 'Excellent Match',
    strong: 'Strong Match',
    good: 'Good Match',
    possible: 'Possible Match',
    poor: 'Poor Match',
  }
  return labels[cat]
}

export function emptyProfile(): CandidateProfile {
  return {
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    city: '',
    headline: '',
    currentTitle: '',
    desiredTitle: '',
    yearsExperience: 0,
    industry: '',
    careerLevel: 'mid',
    skills: [],
    aiSkills: [],
    workModes: ['remote'],
    employmentTypes: ['full-time'],
    salaryMin: 80000,
    salaryDesired: 120000,
    currency: 'USD',
    locations: [],
    remoteWorldwide: true,
    careerGoals: '',
    resumeText: '',
    experience: [],
    onboardingCompleted: false,
    role: 'candidate',
    companyName: '',
    companyWebsite: '',
    avatarUrl: '',
    locale: '',
    identities: [],
    socialLinks: {},
  }
}

export function displayName(p: CandidateProfile): string {
  return `${p.firstName} ${p.lastName}`.trim() || p.email || 'Candidate'
}

export interface DiscoveryProvider {
  name: string
  status: 'ok' | 'error' | 'skipped'
  count: number
  error?: string
  note?: string
}

export interface OfficialBoard {
  source: string
  label: string
  url: string
}

export interface MarketSalary {
  title: string
  country: string
  countryCode: string
  currency: string
  yearlyMin?: number
  yearlyMedian?: number
  yearlyMax?: number
}

export interface DiscoveryReport {
  query: string
  jobs: Job[]
  providers: DiscoveryProvider[]
  officialSearch: OfficialBoard[]
  marketSalary?: MarketSalary
}

export interface DiscoverySummary {
  query: string
  discovered: number
  providers: DiscoveryProvider[]
  officialSearch: OfficialBoard[]
  marketSalary?: MarketSalary
}

export function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    remotive: 'Remotive',
    remoteok: 'Remote OK',
    arbeitnow: 'Arbeitnow',
    themuse: 'The Muse',
    himalayas: 'Himalayas',
    jobicy: 'Jobicy',
    adzuna: 'Adzuna',
    jsearch: 'JSearch',
    bing: 'Bing Jobs',
    xing: 'Xing',
    linkedin: 'LinkedIn',
    indeed: 'Indeed',
    upwork: 'Upwork',
    glassdoor: 'Glassdoor',
    greenhouse: 'Career page',
    lever: 'Career page',
    career_page: 'Career page',
    feed: 'Job feed',
    atelier: 'Atelier',
    wwr: 'We Work Remotely',
    usajobs: 'USAJOBS',
    catalog: 'Atelier',
    ziprecruiter: 'ZipRecruiter',
    naukri: 'Naukri',
    bayt: 'Bayt',
    'jobs-search': 'Jobs Search',
    monster: 'Monster',
    dice: 'Dice',
    freelancer: 'Freelancer',
    workingnomads: 'Working Nomads',
    api: 'API',
  }
  return labels[source] ?? source.replace(/[-_]+/g, ' ')
}
