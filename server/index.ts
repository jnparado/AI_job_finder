import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { careerInsights, followUps, interviewQuestions, preparePacket } from '../shared/engine/packets'
import { matchJobs } from '../shared/engine/matcher'
import { canonicalKey, normalizeAndDedupe } from '../shared/engine/normalize'
import { configuredProviders, discoverJobs } from './discover'
import { coachInterview, enrichMatches, parseJobs, planSearch, strategizeCareer, writePacket } from './agents'
import { routerStatus } from './ai'
import { asJob, inferSeniority } from '../shared/engine/jobFields'
import type {
  CandidateProfile,
  Currency,
  DiscoverySummary,
  EmploymentType,
  Job,
  JobMatch,
  MessageThreadPayload,
  MessageThreadSummary,
  ParsedResume,
  PreparedPacket,
  ThreadMessage,
} from '../shared/types'
import { displayName, emptyProfile, isStaffRole, parseAccountRole, type AccountRole, type SocialIdentity } from '../shared/types'
import { isAtelierJob } from '../shared/applyBoards'
import { JOB_CATALOG } from '../shared/jobs'
import { DEMO_EMPLOYER, DEMO_USER, memory, type StaffInvite, type StoredApplication } from './memory'
import { extractFileText, parseResumeSmart } from './resume'
import { confirmUserEmail, ensureProfileRow, registerUser } from './authUsers'
import { supabaseAdmin, supabaseAuth } from './supabase'
import { emptyFinance, summarizeLedger } from '../shared/finances'
import type { LedgerEntry } from '../shared/finances'
import { isHiredStatus, sessionSeconds, type TrackerSession } from '../shared/tracker'
import { PLANS, defaultPlanId, isPaidPlan, planById, plansFor } from '../shared/billing'
import type { BillingInterval, BillingProvider, BillingRole } from '../shared/billing'
import {
  activateSubscription,
  appOrigin,
  billingConfigured,
  cancelSubscription,
  confirmPayPalSubscription,
  confirmStripeSession,
  createPayPalCheckout,
  createStripeCheckout,
  grantEmployerYearPromo,
  handleStripeWebhook,
  loadSubscription,
} from './billing'

const app = new Hono()
const port = Number(process.env.API_PORT ?? 8787)

const corsOrigins = [
  process.env.APP_URL,
  process.env.VITE_APP_URL,
  'https://ai-job-finder-ecru.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/$/, ''))

app.use(
  '*',
  cors({
    origin: corsOrigins,
    allowHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  }),
)

type AuthUser = { id: string; email: string }

async function auth(c: { req: { header: (n: string) => string | undefined } }): Promise<AuthUser | null> {
  const header = c.req.header('Authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) return null
  if (token === 'demo' || token.startsWith('demo:')) {
    return { id: DEMO_USER, email: 'demo@atelier.local' }
  }
  if (token === 'employer') {
    return { id: DEMO_EMPLOYER, email: 'hiring@atelier.local' }
  }
  if (!supabaseAuth) return null
  const { data } = await supabaseAuth.auth.getUser(token)
  if (!data.user) return null
  return { id: data.user.id, email: data.user.email ?? '' }
}

function socialMetaFromParsed(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') return {}
  const meta = (parsed as { _atelier?: Record<string, unknown> })._atelier
  if (!meta) return {}
  return {
    avatarUrl: String(meta.avatarUrl ?? ''),
    locale: String(meta.locale ?? ''),
    identities: Array.isArray(meta.identities) ? (meta.identities as SocialIdentity[]) : [],
    socialLinks: meta.socialLinks && typeof meta.socialLinks === 'object' ? (meta.socialLinks as Record<string, string>) : {},
    workshop:
      meta.workshop && typeof meta.workshop === 'object' ? (meta.workshop as CandidateProfile['workshop']) : undefined,
  }
}

function withSocialMeta(parsed: CandidateProfile['parsedProfile'], profile: CandidateProfile) {
  const base = parsed && typeof parsed === 'object' ? { ...parsed } : {}
  return {
    ...base,
    _atelier: {
      avatarUrl: profile.avatarUrl ?? '',
      locale: profile.locale ?? '',
      identities: profile.identities ?? [],
      socialLinks: profile.socialLinks ?? {},
      workshop: profile.workshop ?? {},
    },
  }
}

function profileFromRow(row: Record<string, unknown>, email: string): CandidateProfile {
  const parsed = (row.parsed_profile as CandidateProfile['parsedProfile']) ?? null
  const packed = socialMetaFromParsed(parsed)
  return {
    id: String(row.id),
    firstName: String(row.first_name ?? ''),
    lastName: String(row.last_name ?? ''),
    email: String(row.email ?? email),
    country: String(row.country ?? ''),
    city: String(row.city ?? ''),
    headline: String(row.headline ?? ''),
    currentTitle: String(row.current_title ?? ''),
    desiredTitle: String(row.desired_title ?? ''),
    yearsExperience: Number(row.years_experience ?? 0),
    industry: String(row.industry ?? ''),
    careerLevel: (row.career_level as CandidateProfile['careerLevel']) ?? 'mid',
    skills: Array.isArray(row.skills) ? (row.skills as string[]) : [],
    aiSkills: Array.isArray(row.ai_skills) ? (row.ai_skills as string[]) : [],
    workModes: (row.work_modes as CandidateProfile['workModes']) ?? ['remote'],
    employmentTypes: (row.employment_types as CandidateProfile['employmentTypes']) ?? ['full-time'],
    salaryMin: Number(row.salary_min ?? 80000),
    salaryDesired: Number(row.salary_desired ?? 120000),
    currency: (row.currency as CandidateProfile['currency']) ?? 'USD',
    locations: (row.locations as string[]) ?? [],
    remoteWorldwide: Boolean(row.remote_worldwide),
    careerGoals: String(row.career_goals ?? ''),
    resumeText: String(row.resume_text ?? ''),
    experience: [],
    onboardingCompleted: Boolean(row.onboarding_completed),
    parsedProfile: parsed,
    role: parseAccountRole(row.role),
    companyName: String(row.company_name ?? ''),
    companyWebsite: String(row.company_website ?? ''),
    avatarUrl: String(row.avatar_url ?? packed.avatarUrl ?? ''),
    locale: String(row.locale ?? packed.locale ?? ''),
    identities: Array.isArray(row.identities) ? (row.identities as SocialIdentity[]) : packed.identities ?? [],
    socialLinks:
      row.social_links && typeof row.social_links === 'object'
        ? (row.social_links as Record<string, string>)
        : packed.socialLinks ?? {},
    workshop: packed.workshop,
  }
}

function isEmployerJob(job?: Job | null) {
  return Boolean(job && (job.source === 'atelier' || job.employerId))
}

function threadEligible(app: StoredApplication, job?: Job | null) {
  return Boolean(app.authorized && (app.deliveredToEmployer || isEmployerJob(job)))
}

function msgFromRow(row: Record<string, unknown>): ThreadMessage {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    senderId: String(row.sender_id),
    senderRole: row.sender_role === 'employer' ? 'employer' : 'candidate',
    body: String(row.body ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    readAt: row.read_at ? String(row.read_at) : undefined,
  }
}

async function notifyUser(userId: string, title: string, body: string, href?: string) {
  const n = {
    id: crypto.randomUUID(),
    userId,
    title,
    body,
    href,
    read: false,
    createdAt: new Date().toISOString(),
  }
  memory.addNotification(n)
  if (!supabaseAdmin) return
  const { error } = await supabaseAdmin.from('notifications').insert({
    id: n.id,
    user_id: userId,
    title,
    body,
    href,
    read: false,
  })
  if (error) console.warn('notifyUser', error.message)
}

const EMPLOYER_PROMO_TITLE = 'Hiring is free for 1 year'

async function startEmployerPromo(userId: string) {
  const { granted } = await grantEmployerYearPromo(userId)
  if (!granted) return
  const already = memory.getNotifications(userId).some((n) => n.title === EMPLOYER_PROMO_TITLE)
  if (already) return
  await notifyUser(
    userId,
    EMPLOYER_PROMO_TITLE,
    'Your employer account includes the full Hiring plan at no charge for the first year. Post unlimited roles and review packets in your inbox. After that year, billing is yearly — there is no monthly plan.',
    '/employer/billing',
  )
}

async function persistThreadMessage(msg: ThreadMessage) {
  memory.addMessage(msg)
  if (!supabaseAdmin) return
  const { error } = await supabaseAdmin.from('thread_messages').insert({
    id: msg.id,
    application_id: msg.applicationId,
    sender_id: msg.senderId,
    sender_role: msg.senderRole,
    body: msg.body,
    created_at: msg.createdAt,
    read_at: msg.readAt ?? null,
  })
  if (error) console.warn('persistThreadMessage', error.message)
}

async function loadThreadMessages(applicationId: string): Promise<ThreadMessage[]> {
  const local = memory.getMessages(applicationId)
  if (!supabaseAdmin) return local
  try {
    const { data, error } = await supabaseAdmin
      .from('thread_messages')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true })
    if (error) {
      console.warn('loadThreadMessages', error.message)
      return local
    }
    if (!data?.length) return local
    const mapped = data.map((row) => msgFromRow(row as Record<string, unknown>))
    const ids = new Set(mapped.map((m) => m.id))
    memory.setMessages(applicationId, [...mapped, ...local.filter((m) => !ids.has(m.id))])
    return memory.getMessages(applicationId)
  } catch (err) {
    console.warn('loadThreadMessages', err)
    return local
  }
}

async function hydrateThreads(applicationIds: string[]) {
  const ids = [...new Set(applicationIds)].filter(Boolean)
  if (!supabaseAdmin || !ids.length) return
  try {
    const { data, error } = await supabaseAdmin.from('thread_messages').select('*').in('application_id', ids)
    if (error) {
      console.warn('hydrateThreads', error.message)
      return
    }
    const grouped = new Map<string, ThreadMessage[]>()
    for (const row of data ?? []) {
      const msg = msgFromRow(row as Record<string, unknown>)
      const list = grouped.get(msg.applicationId) ?? []
      list.push(msg)
      grouped.set(msg.applicationId, list)
    }
    for (const [applicationId, list] of grouped) {
      const local = memory.getMessages(applicationId)
      const idsInDb = new Set(list.map((m) => m.id))
      memory.setMessages(applicationId, [...list, ...local.filter((m) => !idsInDb.has(m.id))])
    }
  } catch (err) {
    console.warn('hydrateThreads', err)
  }
}

async function markThreadRead(applicationId: string, userId: string) {
  memory.markRead(applicationId, userId)
  if (!supabaseAdmin) return
  const { error } = await supabaseAdmin
    .from('thread_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('application_id', applicationId)
    .neq('sender_id', userId)
    .is('read_at', null)
  if (error) console.warn('markThreadRead', error.message)
}

async function threadContext(user: AuthUser, applicationId: string) {
  const app = await hydrateApplication(applicationId)
  if (!app) return null
  const job = memory.getJob(app.jobId) ?? (await ensureJob(app.jobId))
  const profile = await loadProfile(user)
  const isCandidate = app.userId === user.id
  const isEmployer = profile.role === 'employer' && job?.employerId === user.id
  if (!isCandidate && !isEmployer) return null
  const viewerRole = isEmployer ? ('employer' as const) : ('candidate' as const)
  const canMessage = threadEligible(app, job)
  return { app, job, profile, viewerRole, canMessage }
}

function threadPayload(
  ctx: NonNullable<Awaited<ReturnType<typeof threadContext>>>,
  messages: ThreadMessage[],
): MessageThreadPayload {
  const employerName = ctx.job?.company || 'Employer'
  const candidateName = ctx.app.candidateName || ctx.app.candidateEmail || 'Candidate'
  return {
    applicationId: ctx.app.id,
    canMessage: ctx.canMessage,
    closedReason: ctx.canMessage
      ? undefined
      : ctx.viewerRole === 'candidate'
        ? 'Send the packet to this Atelier employer to open messages.'
        : 'Messages open after the candidate sends their packet.',
    jobTitle: ctx.job?.title ?? 'Role',
    company: employerName,
    otherName: ctx.viewerRole === 'employer' ? candidateName : employerName,
    otherHeadline: ctx.viewerRole === 'employer' ? ctx.app.candidateHeadline : ctx.job?.location,
    viewerRole: ctx.viewerRole,
    packetHref: ctx.viewerRole === 'employer' ? `/employer/inbox/${ctx.app.id}` : `/app/applications/${ctx.app.id}`,
    messages,
  }
}

function threadSummary(
  userId: string,
  viewerRole: 'candidate' | 'employer',
  app: StoredApplication,
  job?: Job,
): MessageThreadSummary {
  const msgs = memory.getMessages(app.id)
  const last = msgs[msgs.length - 1]
  const employerName = job?.company || 'Employer'
  const candidateName = app.candidateName || app.candidateEmail || 'Candidate'
  return {
    applicationId: app.id,
    jobTitle: job?.title ?? 'Role',
    company: employerName,
    otherName: viewerRole === 'employer' ? candidateName : employerName,
    otherHeadline: viewerRole === 'employer' ? app.candidateHeadline : job?.location,
    lastBody: last?.body,
    lastAt: last?.createdAt,
    unreadCount: msgs.filter((m) => m.senderId !== userId && !m.readAt).length,
    href: viewerRole === 'employer' ? `/employer/messages/${app.id}` : `/app/messages/${app.id}`,
  }
}

function findMatch(userId: string, jobId: string, profile: CandidateProfile): JobMatch | undefined {
  const existing = memory.getMatches(userId).find((m) => m.job.id === jobId)
  if (existing) return existing
  const job = memory.getJob(jobId)
  if (!job) return undefined
  return matchJobs([job], profile)[0]
}

async function applyStaffInvite(email: string, userId: string) {
  const target = email.trim().toLowerCase()
  if (!target || !userId) return false
  let pending = memory.getStaffInvite(target)
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('staff_invites').select('*').eq('email', target).eq('status', 'pending').maybeSingle()
    if (error) console.warn('applyStaffInvite', error.message)
    else if (data) {
      pending = {
        id: String(data.id),
        email: target,
        name: target.split('@')[0] ?? 'Admin',
        role: 'admin',
        status: 'pending',
        invitedAt: data.invited_at ? String(data.invited_at) : new Date().toISOString(),
      }
      memory.addStaffInvite(pending)
    }
  }
  if (!pending || pending.status !== 'pending') return false
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', userId)
    if (error) {
      console.warn('applyStaffInvite promote', error.message)
      return false
    }
    await supabaseAdmin
      .from('staff_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('email', target)
  }
  memory.addStaffInvite({ ...pending, status: 'accepted' })
  const current = memory.getProfile(userId)
  memory.setProfile(userId, { ...current, email: current.email || target, role: 'admin' })
  return true
}

async function loadProfile(user: AuthUser): Promise<CandidateProfile> {
  if (supabaseAdmin) {
    try {
      await applyStaffInvite(user.email, user.id)
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle()
      const { data: skills } = await supabaseAdmin.from('user_skills').select('*').eq('user_id', user.id)
      const { data: experience } = await supabaseAdmin.from('experiences').select('*').eq('user_id', user.id)
      if (data) {
        const p = profileFromRow(data as Record<string, unknown>, user.email)
        p.skills = (skills ?? []).filter((s) => s.kind === 'core').map((s) => s.name as string)
        p.aiSkills = (skills ?? []).filter((s) => s.kind === 'ai').map((s) => s.name as string)
        p.experience = (experience ?? []).map((e) => ({
          id: e.id as string,
          title: String(e.title ?? ''),
          company: String(e.company ?? ''),
          start: String(e.start_date ?? ''),
          end: String(e.end_date ?? ''),
          current: Boolean(e.is_current),
          bullets: (e.bullets as string[]) ?? [],
        }))
        return p
      }
      await ensureProfileRow(user.id, user.email)
    } catch (err) {
      console.warn('loadProfile', err)
    }
  }
  const mem = memory.getProfile(user.id)
  if (!mem.email) mem.email = user.email
  return mem
}

async function saveProfile(user: AuthUser, profile: CandidateProfile) {
  memory.setProfile(user.id, profile)
  if ((profile.role ?? 'candidate') === 'employer') await startEmployerPromo(user.id)
  if (!supabaseAdmin) return profile
  const row: Record<string, unknown> = {
    id: user.id,
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: profile.email || user.email,
    country: profile.country,
    city: profile.city,
    headline: profile.headline,
    current_title: profile.currentTitle,
    desired_title: profile.desiredTitle,
    years_experience: profile.yearsExperience,
    industry: profile.industry,
    career_level: profile.careerLevel,
    work_modes: profile.workModes,
    employment_types: profile.employmentTypes,
    salary_min: profile.salaryMin,
    salary_desired: profile.salaryDesired,
    currency: profile.currency,
    locations: profile.locations,
    remote_worldwide: profile.remoteWorldwide,
    career_goals: profile.careerGoals,
    onboarding_completed: profile.onboardingCompleted,
    resume_text: profile.resumeText,
    parsed_profile: withSocialMeta(profile.parsedProfile, profile),
    role: parseAccountRole(profile.role),
    company_name: profile.companyName ?? '',
    company_website: profile.companyWebsite ?? '',
    avatar_url: profile.avatarUrl ?? '',
    locale: profile.locale ?? '',
    identities: profile.identities ?? [],
    social_links: profile.socialLinks ?? {},
  }
  const { error } = await supabaseAdmin.from('profiles').upsert(row)
  if (error && /role|company_name|company_website|avatar_url|identities|social_links|locale/.test(error.message)) {
    delete row.role
    delete row.company_name
    delete row.company_website
    delete row.avatar_url
    delete row.locale
    delete row.identities
    delete row.social_links
    await supabaseAdmin.from('profiles').upsert(row)
    console.warn('profiles missing columns — run supabase/schema.sql')
  }
  await supabaseAdmin.from('user_skills').delete().eq('user_id', user.id)
  const skillRows = [
    ...profile.skills.map((name) => ({ user_id: user.id, name, kind: 'core' })),
    ...profile.aiSkills.map((name) => ({ user_id: user.id, name, kind: 'ai' })),
  ]
  if (skillRows.length) await supabaseAdmin.from('user_skills').insert(skillRows)
  return profile
}

async function persistJobs(jobs: ReturnType<typeof normalizeAndDedupe>['jobs']) {
  memory.setJobs(jobs)
  if (!supabaseAdmin) return
  const rows = jobs.map((job) => ({
    id: job.id,
    source: job.source,
    source_job_id: job.sourceJobId ?? job.id,
    canonical_key: job.canonicalKey,
    title: job.title,
    company: job.company,
    description: job.description,
    location: job.location,
    remote: job.remote,
    employment_type: job.employmentType,
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    currency: job.currency ?? 'USD',
    skills: job.skills,
    required_skills: job.requiredSkills ?? job.skills,
    preferred_skills: job.preferredSkills ?? [],
    required_experience: job.requiredExperience,
    seniority: job.seniority,
    application_url: job.applicationUrl,
    apply_channel: job.applyChannel,
    posted_at: job.postedAt,
    employer_id: job.employerId ?? null,
  }))
  try {
    for (let i = 0; i < rows.length; i += 40) {
      const { error } = await supabaseAdmin.from('jobs').upsert(rows.slice(i, i + 40))
      if (error && /employer_id/.test(error.message)) {
        const stripped = rows.slice(i, i + 40).map(({ employer_id: _e, ...rest }) => rest)
        await supabaseAdmin.from('jobs').upsert(stripped)
      } else if (error) {
        console.warn('persistJobs', error.message)
      }
    }
  } catch (err) {
    console.warn('persistJobs', err)
  }
}

function jobFromRow(row: Record<string, unknown>): Job {
  const id = String(row.id ?? '')
  return asJob({
    id,
    source: String(row.source ?? 'atelier'),
    sourceJobId: String(row.source_job_id ?? id),
    title: String(row.title ?? ''),
    company: String(row.company ?? ''),
    description: String(row.description ?? ''),
    location: row.location ? String(row.location) : undefined,
    remote: Boolean(row.remote),
    employmentType: (row.employment_type as EmploymentType) || 'full-time',
    salaryMin: row.salary_min != null ? Number(row.salary_min) : undefined,
    salaryMax: row.salary_max != null ? Number(row.salary_max) : undefined,
    currency: (row.currency as Currency) || 'USD',
    skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
    requiredSkills: Array.isArray(row.required_skills) ? row.required_skills.map(String) : undefined,
    requiredExperience: row.required_experience != null ? Number(row.required_experience) : undefined,
    seniority: row.seniority as Job['seniority'],
    applicationUrl: String(row.application_url ?? `/app/jobs/${id}`),
    sources: row.application_url
      ? [{ source: String(row.source ?? 'atelier'), url: String(row.application_url) }]
      : undefined,
    applyChannel: row.apply_channel ? String(row.apply_channel) : 'Atelier — sent to employer',
    postedAt: row.posted_at ? String(row.posted_at).slice(0, 10) : undefined,
    canonicalKey: row.canonical_key ? String(row.canonical_key) : undefined,
    employerId: row.employer_id ? String(row.employer_id) : undefined,
  })
}

async function loadEmployerJobs(employerId: string): Promise<Job[]> {
  const local = memory.jobsForEmployer(employerId)
  if (!supabaseAdmin) return local
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
  if (error || !data) {
    if (error) console.warn('loadEmployerJobs', error.message)
    return local
  }
  const fromDb = data.map((row) => jobFromRow(row as Record<string, unknown>))
  memory.setJobs(fromDb)
  const byId = new Map(fromDb.map((job) => [job.id, job]))
  for (const job of local) if (!byId.has(job.id)) byId.set(job.id, job)
  return [...byId.values()]
}

function applicationFromRow(
  row: Record<string, unknown>,
  extras?: {
    answers?: { question: string; answer: string }[]
    candidateName?: string
    candidateEmail?: string
    candidateHeadline?: string
  },
): StoredApplication {
  const name = extras?.candidateName?.trim()
  return {
    id: String(row.id),
    userId: String(row.user_id),
    jobId: String(row.job_id),
    status: String(row.status ?? 'draft'),
    channel: String(row.channel ?? ''),
    authorized: Boolean(row.authorized),
    deliveredToEmployer: Boolean(row.delivered_to_employer),
    packet: {
      tailoredResume: String(row.tailored_resume ?? ''),
      coverLetter: String(row.cover_letter ?? ''),
      answers: extras?.answers ?? [],
      recruiterMessage: String(row.recruiter_message ?? ''),
      resumeNotes: { confirmed: [], unconfirmed: [] },
    },
    submittedAt: row.submitted_at ? String(row.submitted_at) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    events: [],
    followUps: [],
    recruiterSent: false,
    candidateName: name || extras?.candidateEmail,
    candidateEmail: extras?.candidateEmail,
    candidateHeadline: extras?.candidateHeadline,
  }
}

async function ensureJob(jobId: string) {
  const existing = memory.getJob(jobId)
  if (existing) return existing
  if (!supabaseAdmin) return undefined
  const { data } = await supabaseAdmin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (!data) return undefined
  const job = jobFromRow(data as Record<string, unknown>)
  memory.setJobs([job])
  return job
}

async function hydrateApplication(id: string): Promise<StoredApplication | undefined> {
  const existing = memory.getApplicationById(id)
  if (existing) {
    await ensureJob(existing.jobId)
    return existing
  }
  if (!supabaseAdmin) return undefined
  const { data, error } = await supabaseAdmin.from('applications').select('*').eq('id', id).maybeSingle()
  if (error) console.warn('hydrateApplication', error.message)
  if (!data) return undefined
  const { data: answers } = await supabaseAdmin.from('application_answers').select('question, answer').eq('application_id', id)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name, email, headline')
    .eq('id', data.user_id)
    .maybeSingle()
  const app = applicationFromRow(data as Record<string, unknown>, {
    answers: (answers ?? []).map((a) => ({ question: String(a.question ?? ''), answer: String(a.answer ?? '') })),
    candidateName: profile ? `${String(profile.first_name ?? '')} ${String(profile.last_name ?? '')}`.trim() : undefined,
    candidateEmail: profile?.email ? String(profile.email) : undefined,
    candidateHeadline: profile?.headline ? String(profile.headline) : undefined,
  })
  memory.addApplication(app)
  await ensureJob(app.jobId)
  return app
}

async function hydrateApplications(filter: { userId?: string; jobIds?: string[] }) {
  if (!supabaseAdmin) return
  if (filter.jobIds && !filter.jobIds.length) return
  let q = supabaseAdmin.from('applications').select('*')
  if (filter.userId) q = q.eq('user_id', filter.userId)
  if (filter.jobIds?.length) q = q.in('job_id', filter.jobIds)
  const { data, error } = await q
  if (error) {
    console.warn('hydrateApplications', error.message)
    return
  }
  for (const row of data ?? []) {
    const id = String(row.id ?? '')
    if (!id || memory.getApplicationById(id)) {
      if (row.job_id) await ensureJob(String(row.job_id))
      continue
    }
    await hydrateApplication(id)
  }
}

async function prepareEmployerInbox(employerId: string) {
  const jobs = await loadEmployerJobs(employerId)
  await hydrateApplications({ jobIds: jobs.map((job) => job.id) })
  return employerInbox(employerId)
}

async function persistMatches(userId: string, list: JobMatch[]) {
  memory.setMatches(userId, list)
  if (!supabaseAdmin) return
  try {
    const rows = list.map((m) => ({
      user_id: userId,
      job_id: m.job.id,
      overall_score: m.score,
      skills_score: m.breakdown.skills,
      experience_score: m.breakdown.experience,
      title_score: m.breakdown.title,
      salary_score: m.breakdown.salary,
      location_score: m.breakdown.location,
      employment_score: m.breakdown.employment,
      seniority_score: m.breakdown.seniority,
      career_score: m.breakdown.careerGoals,
      matched_skills: m.matchedSkills,
      missing_skills: m.missingSkills,
      ai_summary: m.summary,
      ai_recommendation: m.recommendation,
      category: m.category,
      status: 'new',
    }))
    for (let i = 0; i < rows.length; i += 40) {
      await supabaseAdmin.from('job_matches').upsert(rows.slice(i, i + 40), { onConflict: 'user_id,job_id' })
    }
  } catch {
    /* matches still live in memory */
  }
}

async function runSearch(user: AuthUser, minMatch = 0, maxJobs = 40) {
  const profile = await loadProfile(user)
  const plan = await planSearch(profile)
  const discovered = await discoverJobs(profile, { query: plan.query })
  const posted = memory.atelierJobs()
  const parsedJobs = await parseJobs([...posted, ...discovered.jobs])
  const { jobs, duplicatesRemoved } = normalizeAndDedupe(parsedJobs)
  await persistJobs(jobs)
  const scored = matchJobs(jobs, profile)
  const all = await enrichMatches(scored, profile)
  const filtered = all.filter((m) => m.score >= minMatch).slice(0, maxJobs)
  await persistMatches(user.id, all)
  const counts = {
    excellent: all.filter((m) => m.category === 'excellent').length,
    strong: all.filter((m) => m.category === 'strong').length,
    good: all.filter((m) => m.category === 'good').length,
    possible: all.filter((m) => m.category === 'possible').length,
    poor: all.filter((m) => m.category === 'poor').length,
  }
  const summary: DiscoverySummary = {
    query: discovered.query,
    discovered: discovered.jobs.length,
    providers: [
      { name: 'Employers on Atelier', status: 'ok', count: posted.length },
      ...discovered.providers,
    ],
    officialSearch: discovered.officialSearch,
    marketSalary: discovered.marketSalary,
  }
  memory.setDiscovery(user.id, summary)
  const high = all.filter((m) => m.score >= 80)
  if (high.length) {
    memory.addNotification({
      id: crypto.randomUUID(),
      userId: user.id,
      title: `Your AI Job Agent found ${high.length} new matches`,
      body: high
        .slice(0, 4)
        .map((m) => `${m.job.title} — ${m.score}%`)
        .join('\n'),
      href: '/app/jobs',
      read: false,
      createdAt: new Date().toISOString(),
    })
    if (supabaseAdmin) {
      await supabaseAdmin.from('notifications').insert({
        user_id: user.id,
        title: `Your AI Job Agent found ${high.length} new matches`,
        body: high.slice(0, 4).map((m) => `${m.job.title} — ${m.score}%`).join('\n'),
        href: '/app/jobs',
      })
      await supabaseAdmin.from('ai_agent_runs').insert({
        user_id: user.id,
        agent: 'search',
        status: 'done',
        stats: { discovered: discovered.jobs.length, duplicatesRemoved, scored: all.length, counts },
      })
    }
  }
  return { jobs, duplicatesRemoved, matches: filtered, all, counts, discovery: summary }
}

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    supabase: Boolean(supabaseAdmin),
    openai: Boolean(process.env.OPENAI_API_KEY),
    discovery: configuredProviders(),
    router: routerStatus(),
    billing: billingConfigured(),
  }),
)

app.post('/api/auth/register', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    email?: string
    password?: string
    role?: string
    companyName?: string
  }
  const email = String(body.email ?? '').trim()
  const password = String(body.password ?? '')
  const role = body.role === 'employer' ? 'employer' : 'candidate'
  const companyName = String(body.companyName ?? '').trim()
  if (!email || password.length < 8) {
    return c.json({ error: 'Use a valid email and a password of at least 8 characters.' }, 400)
  }
  if (role === 'employer' && !companyName) {
    return c.json({ error: 'Add your company name to post jobs.' }, 400)
  }
  try {
    const result = await registerUser(email, password, { role, companyName })
    await applyStaffInvite(email, result.userId)
    if (role === 'employer') {
      memory.setProfile(result.userId, {
        ...emptyProfile(),
        email,
        role: 'employer',
        companyName,
        onboardingCompleted: true,
      })
      await startEmployerPromo(result.userId)
    }
    return c.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the account.'
    const code = (err as { code?: string }).code
    return c.json({ error: message, code }, code === 'exists' ? 409 : 400)
  }
})

app.post('/api/auth/confirm', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { email?: string }
  const email = String(body.email ?? '').trim()
  if (!email) return c.json({ error: 'Email required' }, 400)
  try {
    await confirmUserEmail(email)
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Could not confirm email' }, 400)
  }
})

app.get('/api/profile', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  return c.json(await loadProfile(user))
})

app.post('/api/profile', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const body = (await c.req.json()) as Partial<CandidateProfile>
  const current = await loadProfile(user)
  const next = { ...current, ...body, email: body.email || current.email || user.email }
  if (isStaffRole(current.role)) next.role = current.role
  else next.role = body.role === 'employer' || (body.role === undefined && current.role === 'employer') ? 'employer' : 'candidate'
  return c.json(await saveProfile(user, next))
})

app.post('/api/profile/sync-identity', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const body = (await c.req.json()) as {
    provider?: string
    email?: string
    firstName?: string
    lastName?: string
    fullName?: string
    avatarUrl?: string
    locale?: string
  }
  const current = await loadProfile(user)
  const [first, ...rest] = (body.fullName ?? '').split(/\s+/).filter(Boolean)
  const identity: SocialIdentity = {
    provider: body.provider || 'google',
    email: body.email || user.email,
    name: body.fullName || `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim(),
    avatarUrl: body.avatarUrl,
    connectedAt: new Date().toISOString(),
  }
  const next = {
    ...current,
    firstName: current.firstName || body.firstName || first || '',
    lastName: current.lastName || body.lastName || rest.join(' '),
    email: current.email || body.email || user.email,
    avatarUrl: current.avatarUrl || body.avatarUrl || '',
    locale: current.locale || body.locale || '',
    identities: [...(current.identities ?? []).filter((i) => i.provider !== identity.provider), identity],
  }
  return c.json(await saveProfile(user, next))
})

const MAX_RESUME_BYTES = 8 * 1024 * 1024

function isUploadedFile(value: unknown): value is File {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as File).arrayBuffer === 'function' &&
      typeof (value as File).name === 'string',
  )
}

function resumeFileOk(name: string, mime: string) {
  const lower = name.toLowerCase()
  return (
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.txt') ||
    /pdf|wordprocessingml|msword|text\/plain/i.test(mime)
  )
}

function safeResumeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'resume'
}

async function applyParsedResume(user: AuthUser, text: string, parsed: ParsedResume) {
  const profile = await loadProfile(user)
  const merged: CandidateProfile = {
    ...profile,
    resumeText: text,
    parsedProfile: parsed,
    headline: profile.headline || parsed.headline,
    currentTitle: profile.currentTitle || parsed.headline,
    yearsExperience: profile.yearsExperience || parsed.experience_years,
    skills: [...new Set([...profile.skills, ...parsed.skills])],
    aiSkills: [...new Set([...profile.aiSkills, ...parsed.ai_skills])],
    industry: profile.industry || parsed.industries[0] || '',
    desiredTitle: profile.desiredTitle || parsed.headline,
  }
  if (parsed.name && !profile.firstName) {
    const [first, ...rest] = parsed.name.split(' ')
    merged.firstName = first
    merged.lastName = rest.join(' ')
  }
  await saveProfile(user, merged)
  return merged
}

async function ingestResumeBuffer(
  user: AuthUser,
  buffer: Buffer,
  fileName: string,
  mime: string,
  storedPath?: string,
) {
  if (!buffer.length) throw new Error('That file is empty.')
  if (buffer.length > MAX_RESUME_BYTES) throw new Error('Keep the file under 8 MB.')
  if (!resumeFileOk(fileName, mime)) throw new Error('Use a PDF, DOCX, or TXT file.')
  const text = (await extractFileText(buffer, mime, fileName)).replace(/\u0000/g, '').trim()
  if (text.length < 20) {
    throw new Error('Could not read that resume. Try another PDF or paste the text below.')
  }
  const parsed = await parseResumeSmart(text)
  const merged = await applyParsedResume(user, text, parsed)
  if (supabaseAdmin) {
    try {
      const path = storedPath || `${user.id}/${Date.now()}-${safeResumeName(fileName)}`
      if (!storedPath) {
        const { error: uploadError } = await supabaseAdmin.storage.from('resumes').upload(path, buffer, {
          contentType: mime || 'application/octet-stream',
          upsert: true,
        })
        if (uploadError) console.warn('resume storage upload', uploadError.message)
      }
      const { error: rowError } = await supabaseAdmin.from('resumes').insert({
        user_id: user.id,
        file_path: path,
        file_name: fileName,
        mime_type: mime,
        extracted_text: text,
        parsed,
        is_primary: true,
      })
      if (rowError) console.warn('resume row', rowError.message)
    } catch (err) {
      console.warn('resume storage', err instanceof Error ? err.message : err)
    }
  }
  return { text, parsed, profile: merged }
}

app.post('/api/resume/upload', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const contentType = c.req.header('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = (await c.req.json()) as {
        fileName?: string
        mimeType?: string
        contentBase64?: string
      }
      const fileName = String(body.fileName || 'resume.txt')
      const mime = String(body.mimeType || '')
      const raw = String(body.contentBase64 || '').replace(/\s+/g, '')
      if (!raw) return c.json({ error: 'Choose a resume file to upload.' }, 400)
      const buffer = Buffer.from(raw, 'base64')
      return c.json(await ingestResumeBuffer(user, buffer, fileName, mime))
    }
    const form = await c.req.formData()
    const file = form.get('file')
    if (!isUploadedFile(file)) return c.json({ error: 'Choose a resume file to upload.' }, 400)
    const buffer = Buffer.from(await file.arrayBuffer())
    return c.json(await ingestResumeBuffer(user, buffer, file.name || 'resume.pdf', file.type || ''))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return c.json({ error: message }, 400)
  }
})

app.post('/api/resume/from-storage', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (!supabaseAdmin) return c.json({ error: 'Storage is not configured.' }, 500)
  try {
    const body = (await c.req.json()) as { path?: string; fileName?: string; mimeType?: string }
    const path = String(body.path ?? '')
    if (!path.startsWith(`${user.id}/`)) return c.json({ error: 'Invalid resume path.' }, 403)
    const { data, error } = await supabaseAdmin.storage.from('resumes').download(path)
    if (error || !data) return c.json({ error: error?.message ?? 'Could not read the uploaded file.' }, 400)
    const buffer = Buffer.from(await data.arrayBuffer())
    return c.json(
      await ingestResumeBuffer(
        user,
        buffer,
        body.fileName || path.split('/').pop() || 'resume.pdf',
        body.mimeType || '',
        path,
      ),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return c.json({ error: message }, 400)
  }
})

app.post('/api/resume/parse-text', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { text } = (await c.req.json()) as { text?: string }
    const raw = String(text ?? '').replace(/\u0000/g, '').trim()
    if (raw.length < 20) {
      return c.json({ error: 'Paste more of your resume so we can read it.' }, 400)
    }
    const parsed = await parseResumeSmart(raw)
    const profile = await applyParsedResume(user, raw, parsed)
    return c.json({ parsed, profile })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed'
    return c.json({ error: message }, 400)
  }
})

app.post('/api/agent/search', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const body = (await c.req.json().catch(() => ({}))) as { minMatch?: number; maxJobs?: number }
  const result = await runSearch(user, body.minMatch ?? 0, body.maxJobs ?? 50)
  return c.json({
    discovered: result.discovery.discovered,
    normalized: result.jobs.length,
    duplicatesRemoved: result.duplicatesRemoved,
    counts: result.counts,
    matches: result.all,
    discovery: result.discovery,
  })
})

app.get('/api/agent/discovery', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  return c.json(memory.getDiscovery(user.id))
})

app.get('/api/jobs', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  let list = memory.getMatches(user.id)
  if (!list.length) {
    const result = await runSearch(user)
    list = result.all
  }
  const min = Number(c.req.query('min') ?? 0)
  return c.json(list.filter((m) => m.score >= min))
})

app.get('/api/jobs/:id', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const profile = await loadProfile(user)
  const match = findMatch(user.id, id, profile)
  if (!match) return c.json({ error: 'Not found' }, 404)
  return c.json(match)
})

app.post('/api/applications', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { jobId } = (await c.req.json()) as { jobId: string }
  const profile = await loadProfile(user)
  const match = findMatch(user.id, jobId, profile)
  if (!match) return c.json({ error: 'Match not found. Run search first.' }, 404)
  const existing = memory.getApplications(user.id).find((a) => a.jobId === jobId && a.status === 'draft')
  if (existing) return c.json(existing)
  const packet = await writePacket(match, profile, preparePacket(match, profile))
  const direct = isEmployerJob(match.job)
  const appRow: StoredApplication = {
    id: crypto.randomUUID(),
    userId: user.id,
    jobId,
    status: 'draft',
    channel: direct ? 'Atelier employer inbox' : (match.job.applyChannel ?? 'Authorized portal'),
    authorized: false,
    packet,
    createdAt: new Date().toISOString(),
    events: [
      {
        at: new Date().toISOString(),
        label: 'Packet prepared',
        detail: direct
          ? 'Review the packet. When you approve, it is sent to the employer on Atelier.'
          : packet.aiLane
            ? 'GPT-5.6 Terra drafted the resume, cover letter, and answers. Nothing submitted.'
            : 'Resume customized, cover letter and answers drafted. Nothing submitted.',
      },
    ],
    followUps: followUps(match, profile).map((f) => ({ ...f, sent: false })),
    recruiterSent: false,
    candidateName: displayName(profile),
    candidateEmail: profile.email || user.email,
    candidateHeadline: profile.headline || profile.desiredTitle || profile.currentTitle,
  }
  memory.addApplication(appRow)
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: jobId,
        status: 'draft',
        channel: appRow.channel,
        tailored_resume: packet.tailoredResume,
        cover_letter: packet.coverLetter,
        recruiter_message: packet.recruiterMessage,
      })
      .select('id')
      .single()
    if (data?.id) appRow.id = data.id as string
    await supabaseAdmin.from('application_answers').insert(
      packet.answers.map((a) => ({
        application_id: appRow.id,
        question: a.question,
        answer: a.answer,
      })),
    )
  }
  return c.json(appRow)
})

app.get('/api/applications', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  await hydrateApplications({ userId: user.id })
  return c.json(memory.getApplications(user.id))
})

app.get('/api/applications/:id', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  await hydrateApplication(id)
  const row = memory.getApplication(user.id, id)
  if (!row) return c.json({ error: 'Not found' }, 404)
  const profile = await loadProfile(user)
  const match = findMatch(user.id, row.jobId, profile)
  return c.json({
    ...row,
    match,
    interview: match ? interviewQuestions(match, profile) : [],
    directToEmployer: isEmployerJob(match?.job),
  })
})

app.patch('/api/applications/:id', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const row = memory.getApplication(user.id, c.req.param('id'))
  if (!row) return c.json({ error: 'Not found' }, 404)
  const body = (await c.req.json()) as Partial<StoredApplication> & {
    packet?: PreparedPacket
    status?: string
  }
  if (body.packet) row.packet = { ...row.packet, ...body.packet }
  if (body.status) {
    row.status = body.status
    row.events.push({
      at: new Date().toISOString(),
      label: body.status.replaceAll('_', ' '),
      detail: 'Status updated.',
    })
  }
  memory.addApplication(row)
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('applications')
      .update({
        status: row.status,
        tailored_resume: row.packet.tailoredResume,
        cover_letter: row.packet.coverLetter,
        recruiter_message: row.packet.recruiterMessage,
      })
      .eq('id', row.id)
  }
  return c.json(row)
})

app.post('/api/applications/:id/approve', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const row = memory.getApplication(user.id, c.req.param('id'))
  if (!row) return c.json({ error: 'Not found' }, 404)
  const profile = await loadProfile(user)
  const match = findMatch(user.id, row.jobId, profile)
  const job = match?.job ?? memory.getJob(row.jobId)
  const direct = isEmployerJob(job)
  row.authorized = true
  row.status = 'submitted'
  row.submittedAt = new Date().toISOString()
  row.deliveredToEmployer = direct
  row.events.push({
    at: row.submittedAt,
    label: direct ? 'Sent to employer' : 'Authorized submission',
    detail: direct
      ? `Packet delivered to ${job?.company ?? 'the employer'} on Atelier.`
      : match?.job.applyChannel?.includes('Open listing')
        ? 'Materials ready. Open the official job page to submit yourself — no undocumented automation.'
        : `Submitted through ${row.channel}.`,
  })
  memory.addApplication(row)
  if (direct && job?.employerId) {
    await notifyUser(
      job.employerId,
      `New application: ${job.title}`,
      `${row.candidateName || displayName(profile)} applied for ${job.title}.`,
      `/employer/inbox/${row.id}`,
    )
  }
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('applications')
      .update({
        authorized: true,
        status: 'submitted',
        submitted_at: row.submittedAt,
        delivered_to_employer: direct,
      })
      .eq('id', row.id)
  }
  return c.json({
    application: row,
    openUrl: direct ? undefined : match?.job.applicationUrl,
    deliveredToEmployer: direct,
  })
})

app.post('/api/applications/:id/follow-up', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const row = memory.getApplication(user.id, c.req.param('id'))
  if (!row) return c.json({ error: 'Not found' }, 404)
  const { index } = (await c.req.json()) as { index: number }
  if (!row.followUps[index]) return c.json({ error: 'Follow-up missing' }, 400)
  row.followUps[index].sent = true
  row.events.push({
    at: new Date().toISOString(),
    label: row.followUps[index].title,
    detail: 'Sent through the authorized channel after your approval.',
  })
  memory.addApplication(row)
  return c.json(row)
})

app.post('/api/applications/:id/recruiter', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const row = memory.getApplication(user.id, c.req.param('id'))
  if (!row) return c.json({ error: 'Not found' }, 404)
  row.recruiterSent = true
  row.events.push({
    at: new Date().toISOString(),
    label: 'Recruiter message',
    detail: 'Approved message sent through the authorized channel only.',
  })
  memory.addApplication(row)
  return c.json(row)
})

app.get('/api/notifications', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40)
    if (data?.length) {
      const seen = new Set(memory.getNotifications(user.id).map((n) => n.id))
      for (const row of [...data].reverse()) {
        const id = String(row.id)
        if (seen.has(id)) continue
        memory.addNotification({
          id,
          userId: user.id,
          title: String(row.title),
          body: row.body ? String(row.body) : '',
          href: row.href ? String(row.href) : undefined,
          read: Boolean(row.read),
          createdAt: String(row.created_at ?? new Date().toISOString()),
        })
      }
    }
  }
  return c.json(memory.getNotifications(user.id))
})

app.get('/api/agent/settings', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin.from('agent_settings').select('*').eq('user_id', user.id).maybeSingle()
    if (data) {
      return c.json({
        enabled: data.enabled,
        runHour: data.run_hour,
        minMatch: data.min_match,
        maxJobs: data.max_jobs,
      })
    }
  }
  return c.json(memory.getSettings(user.id))
})

app.post('/api/agent/settings', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const body = (await c.req.json()) as {
    enabled?: boolean
    runHour?: number
    minMatch?: number
    maxJobs?: number
  }
  const current = memory.getSettings(user.id)
  const next = { ...current, ...body }
  memory.setSettings(user.id, next)
  if (supabaseAdmin) {
    await supabaseAdmin.from('agent_settings').upsert({
      user_id: user.id,
      enabled: next.enabled,
      run_hour: next.runHour,
      min_match: next.minMatch,
      max_jobs: next.maxJobs,
    })
  }
  return c.json(next)
})

function employerInbox(employerId: string) {
  const jobIds = new Set(memory.jobsForEmployer(employerId).map((j) => j.id))
  return memory
    .allApplications()
    .filter((a) => jobIds.has(a.jobId) && a.authorized)
    .map((a) => ({
      ...a,
      job: memory.getJob(a.jobId),
    }))
}

app.get('/api/employer/jobs', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role !== 'employer') return c.json({ error: 'Employer account required' }, 403)
  return c.json(await loadEmployerJobs(user.id))
})

app.post('/api/employer/jobs', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role !== 'employer') return c.json({ error: 'Employer account required' }, 403)
  if (!profile.companyName?.trim()) {
    return c.json({ error: 'Add your company name in setup before posting a job.' }, 400)
  }
  const body = (await c.req.json()) as {
    title?: string
    description?: string
    location?: string
    remote?: boolean
    employmentType?: EmploymentType
    salaryMin?: number
    salaryMax?: number
    currency?: Currency
    skills?: string[] | string
    requiredExperience?: number
    seniority?: Job['seniority']
  }
  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  if (!title || description.length < 40) {
    return c.json({ error: 'Add a title and a description of at least 40 characters.' }, 400)
  }
  const skills = Array.isArray(body.skills)
    ? body.skills.map((s) => s.trim()).filter(Boolean)
    : String(body.skills ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
  const id = `atelier-${crypto.randomUUID()}`
  const job = asJob({
    id,
    source: 'atelier',
    sourceJobId: id,
    title,
    company: profile.companyName || displayName(profile) || 'Employer',
    description,
    location: body.location || (body.remote !== false ? 'Remote worldwide' : ''),
    remote: body.remote !== false,
    employmentType: body.employmentType ?? 'full-time',
    salaryMin: body.salaryMin,
    salaryMax: body.salaryMax,
    currency: body.currency ?? 'USD',
    skills,
    requiredSkills: skills,
    requiredExperience: body.requiredExperience,
    seniority: body.seniority ?? inferSeniority(title, description),
    applicationUrl: `/app/jobs/${id}`,
    applyChannel: 'Atelier — sent to employer',
    postedAt: new Date().toISOString().slice(0, 10),
    employerId: user.id,
    canonicalKey: canonicalKey({ company: profile.companyName || displayName(profile) || 'Employer', title }),
  })
  await persistJobs([job])
  return c.json(job)
})

app.get('/api/employer/applications', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role !== 'employer') return c.json({ error: 'Employer account required' }, 403)
  return c.json(await prepareEmployerInbox(user.id))
})

app.get('/api/messages', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role === 'employer') {
    const inbox = await prepareEmployerInbox(user.id)
    await hydrateThreads(inbox.map((a) => a.id))
    return c.json(inbox.map((a) => threadSummary(user.id, 'employer', a, a.job)))
  }
  await hydrateApplications({ userId: user.id })
  const apps = memory
    .getApplications(user.id)
    .filter((a) => threadEligible(a, memory.getJob(a.jobId)))
  await hydrateThreads(apps.map((a) => a.id))
  return c.json(apps.map((a) => threadSummary(user.id, 'candidate', a, memory.getJob(a.jobId))))
})

app.get('/api/applications/:id/messages', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const ctx = await threadContext(user, c.req.param('id'))
  if (!ctx) return c.json({ error: 'Not found' }, 404)
  await loadThreadMessages(ctx.app.id)
  await markThreadRead(ctx.app.id, user.id)
  return c.json(threadPayload(ctx, memory.getMessages(ctx.app.id)))
})

app.post('/api/applications/:id/messages', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const ctx = await threadContext(user, c.req.param('id'))
  if (!ctx) return c.json({ error: 'Not found' }, 404)
  if (!ctx.canMessage) {
    return c.json({ error: ctx.viewerRole === 'candidate' ? 'Send the packet before messaging this employer.' : 'Wait until the candidate sends their packet.' }, 403)
  }
  const body = String(((await c.req.json().catch(() => ({}))) as { body?: string }).body ?? '').trim()
  if (!body) return c.json({ error: 'Write a message first.' }, 400)
  if (body.length > 4000) return c.json({ error: 'Keep messages under 4,000 characters.' }, 400)
  const msg: ThreadMessage = {
    id: crypto.randomUUID(),
    applicationId: ctx.app.id,
    senderId: user.id,
    senderRole: ctx.viewerRole,
    body,
    createdAt: new Date().toISOString(),
  }
  await persistThreadMessage(msg)
  const recipientId = ctx.viewerRole === 'employer' ? ctx.app.userId : ctx.job?.employerId
  if (recipientId) {
    const preview = body.length > 140 ? `${body.slice(0, 137)}…` : body
    await notifyUser(
      recipientId,
      ctx.viewerRole === 'employer' ? `${ctx.job?.company ?? 'Employer'} sent a message` : `${ctx.app.candidateName || 'A candidate'} sent a message`,
      preview,
      ctx.viewerRole === 'employer' ? `/app/messages/${ctx.app.id}` : `/employer/messages/${ctx.app.id}`,
    )
  }
  ctx.app.events.push({
    at: msg.createdAt,
    label: 'Message',
    detail: ctx.viewerRole === 'employer' ? 'Employer sent a message on Atelier.' : 'You sent a message to the employer.',
  })
  memory.addApplication(ctx.app)
  return c.json(threadPayload(ctx, memory.getMessages(ctx.app.id)))
})

app.get('/api/employer/applications/:id', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role !== 'employer') return c.json({ error: 'Employer account required' }, 403)
  const row = await hydrateApplication(c.req.param('id'))
  const job = row ? memory.getJob(row.jobId) ?? (await ensureJob(row.jobId)) : undefined
  if (!row || job?.employerId !== user.id) return c.json({ error: 'Not found' }, 404)
  return c.json({ ...row, job })
})

app.patch('/api/employer/applications/:id', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role !== 'employer') return c.json({ error: 'Employer account required' }, 403)
  const row = memory.getApplicationById(c.req.param('id'))
  const job = row ? memory.getJob(row.jobId) : undefined
  if (!row || job?.employerId !== user.id) return c.json({ error: 'Not found' }, 404)
  const body = (await c.req.json()) as { status?: string }
  if (body.status) {
    row.status = body.status
    row.events.push({
      at: new Date().toISOString(),
      label: body.status.replaceAll('_', ' '),
      detail: `${job?.company ?? 'Employer'} updated this application.`,
    })
    memory.addApplication(row)
    const hired = isHiredStatus(body.status)
    await notifyUser(
      row.userId,
      hired
        ? `${job?.title ?? 'Role'} is hired — Atelier time tracker is open`
        : `${job?.title ?? 'Application'} is now ${body.status.replaceAll('_', ' ')}`,
      hired
        ? `${job?.company ?? 'The employer'} marked you hired. Open Atelier time tracker to log hours on this role.`
        : `${job?.company ?? 'The employer'} updated your application.`,
      hired ? '/app/ateliar' : `/app/applications/${row.id}`,
    )
  }
  if (supabaseAdmin) {
    await supabaseAdmin.from('applications').update({ status: row.status }).eq('id', row.id)
  }
  return c.json({ ...row, job })
})

function ledgerFromRow(row: Record<string, unknown>): LedgerEntry {
  const status = row.status
  const kind = row.kind === 'withdraw' ? 'withdraw' : 'from_employer'
  return {
    id: String(row.id),
    candidateId: String(row.candidate_id ?? ''),
    employerId: row.employer_id ? String(row.employer_id) : undefined,
    applicationId: row.application_id ? String(row.application_id) : undefined,
    jobTitle: row.job_title ? String(row.job_title) : undefined,
    company: row.company ? String(row.company) : undefined,
    kind,
    status: status === 'available' || status === 'sent' || status === 'failed' ? status : 'pending',
    amount: Number(row.amount ?? 0),
    currency: (row.currency as Currency) || 'USD',
    note: row.note ? String(row.note) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

async function persistLedger(row: LedgerEntry) {
  memory.addLedger(row)
  if (!supabaseAdmin) return
  const { error } = await supabaseAdmin.from('ledger_entries').insert({
    id: row.id,
    candidate_id: row.candidateId,
    employer_id: row.employerId ?? null,
    application_id: row.applicationId ?? null,
    job_title: row.jobTitle ?? null,
    company: row.company ?? null,
    kind: row.kind,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    note: row.note ?? null,
    created_at: row.createdAt,
  })
  if (error) console.warn('ledger row', error.message)
}

function financeFor(candidateId: string, currency: Currency = 'USD') {
  return summarizeLedger(memory.getLedgerForCandidate(candidateId), currency)
}

function sessionFromRow(row: Record<string, unknown>): TrackerSession {
  return {
    id: String(row.id),
    candidateId: String(row.candidate_id ?? ''),
    employerId: row.employer_id ? String(row.employer_id) : undefined,
    applicationId: String(row.application_id ?? ''),
    jobTitle: String(row.job_title ?? 'Hired role'),
    company: String(row.company ?? 'Atelier employer'),
    startedAt: String(row.started_at ?? new Date().toISOString()),
    endedAt: row.ended_at ? String(row.ended_at) : undefined,
    seconds: Number(row.seconds ?? 0),
    note: row.note ? String(row.note) : undefined,
  }
}

async function hydrateTracker(filter: { candidateId?: string; employerId?: string } = {}) {
  if (!supabaseAdmin) return
  let q = supabaseAdmin.from('ateliar_sessions').select('*')
  if (filter.candidateId) q = q.eq('candidate_id', filter.candidateId)
  if (filter.employerId) q = q.eq('employer_id', filter.employerId)
  const { data, error } = await q.order('started_at', { ascending: false }).limit(200)
  if (error) {
    console.warn('hydrateTracker', error.message)
    return
  }
  for (const row of data ?? []) {
    memory.addTrackerSession(sessionFromRow(row as Record<string, unknown>))
  }
}

function hiredRolesFor(userId: string) {
  return memory
    .getApplications(userId)
    .filter((a) => isHiredStatus(a.status))
    .map((a) => {
      const job = memory.getJob(a.jobId)
      return {
        applicationId: a.id,
        jobId: a.jobId,
        jobTitle: job?.title ?? 'Hired role',
        company: job?.company ?? 'Atelier employer',
        employerId: job?.employerId,
        status: a.status,
      }
    })
}

app.get('/api/ateliar', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role === 'employer') {
    await hydrateTracker({ employerId: user.id })
    const sessions = memory.getTrackerForEmployer(user.id).map((s) => ({
      ...s,
      seconds: sessionSeconds(s),
    }))
    return c.json({ role: 'employer', sessions })
  }
  await hydrateApplications({ userId: user.id })
  await hydrateTracker({ candidateId: user.id })
  const sessions = memory.getTrackerSessions(user.id).map((s) => ({
    ...s,
    seconds: sessionSeconds(s),
  }))
  return c.json({
    role: 'candidate',
    roles: hiredRolesFor(user.id),
    sessions,
    running: sessions.find((s) => !s.endedAt) ?? null,
  })
})

app.post('/api/ateliar/start', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  await hydrateApplications({ userId: user.id })
  await hydrateTracker({ candidateId: user.id })
  const running = memory.getTrackerSessions(user.id).find((s) => !s.endedAt)
  if (running) return c.json({ error: 'Clock out of the open shift first.', session: running }, 400)
  const body = (await c.req.json().catch(() => ({}))) as { applicationId?: string; note?: string }
  const roles = hiredRolesFor(user.id)
  const role = roles.find((r) => r.applicationId === body.applicationId) ?? roles[0]
  if (!role) return c.json({ error: 'Atelier time tracker opens after an Atelier employer marks you hired.' }, 400)
  const row: TrackerSession = {
    id: crypto.randomUUID(),
    candidateId: user.id,
    employerId: role.employerId,
    applicationId: role.applicationId,
    jobTitle: role.jobTitle,
    company: role.company,
    startedAt: new Date().toISOString(),
    seconds: 0,
    note: String(body.note ?? '').trim(),
  }
  memory.addTrackerSession(row)
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('ateliar_sessions').insert({
      id: row.id,
      candidate_id: row.candidateId,
      employer_id: row.employerId ?? null,
      application_id: row.applicationId,
      job_title: row.jobTitle,
      company: row.company,
      started_at: row.startedAt,
      seconds: 0,
      note: row.note ?? null,
    })
    if (error) console.warn('ateliar start', error.message)
  }
  return c.json({ session: row })
})

app.post('/api/ateliar/stop', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  await hydrateTracker({ candidateId: user.id })
  const body = (await c.req.json().catch(() => ({}))) as { sessionId?: string; note?: string }
  const session =
    (body.sessionId ? memory.getTrackerSession(body.sessionId) : undefined) ??
    memory.getTrackerSessions(user.id).find((s) => !s.endedAt)
  if (!session || session.candidateId !== user.id) return c.json({ error: 'No open shift.' }, 400)
  session.seconds = sessionSeconds(session)
  session.endedAt = new Date().toISOString()
  if (body.note) session.note = String(body.note).trim()
  memory.addTrackerSession(session)
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('ateliar_sessions')
      .update({ ended_at: session.endedAt, seconds: session.seconds, note: session.note ?? null })
      .eq('id', session.id)
  }
  return c.json({ session })
})

app.get('/api/finances', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role === 'employer') {
    return c.json({
      role: 'employer',
      sent: memory.getLedgerForEmployer(user.id),
      overview: emptyFinance(profile.currency),
    })
  }
  return c.json({
    role: 'candidate',
    overview: financeFor(user.id, profile.currency),
  })
})

app.post('/api/finances/withdraw', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role === 'employer') return c.json({ error: 'Employer accounts send pay, they do not withdraw it.' }, 403)
  const body = (await c.req.json().catch(() => ({}))) as { amount?: number }
  const amount = Math.round(Number(body.amount) || 0)
  const desk = financeFor(user.id, profile.currency)
  if (amount < 20) return c.json({ error: 'Withdraw at least 20.' }, 400)
  if (amount > desk.available) return c.json({ error: 'That is more than your available balance.' }, 400)
  const row: LedgerEntry = {
    id: crypto.randomUUID(),
    candidateId: user.id,
    kind: 'withdraw',
    status: 'sent',
    amount,
    currency: profile.currency,
    note: 'Payout requested from your Atelier desk.',
    createdAt: new Date().toISOString(),
  }
  await persistLedger(row)
  return c.json({ overview: financeFor(user.id, profile.currency), entry: row })
})

app.post('/api/employer/applications/:id/pay', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role !== 'employer') return c.json({ error: 'Employer account required' }, 403)
  const appRow = memory.getApplicationById(c.req.param('id'))
  const job = appRow ? memory.getJob(appRow.jobId) : undefined
  if (!appRow || job?.employerId !== user.id) return c.json({ error: 'Not found' }, 404)
  const body = (await c.req.json().catch(() => ({}))) as { amount?: number; note?: string }
  const amount = Math.round(Number(body.amount) || 0)
  if (amount < 20) return c.json({ error: 'Send at least 20.' }, 400)
  const row: LedgerEntry = {
    id: crypto.randomUUID(),
    candidateId: appRow.userId,
    employerId: user.id,
    applicationId: appRow.id,
    jobTitle: job?.title,
    company: job?.company || profile.companyName,
    kind: 'from_employer',
    status: 'available',
    amount,
    currency: job?.currency || profile.currency || 'USD',
    note: String(body.note ?? '').trim() || `Pay for ${job?.title ?? 'your Atelier role'}`,
    createdAt: new Date().toISOString(),
  }
  await persistLedger(row)
  await notifyUser(
    appRow.userId,
    `${job?.company ?? 'An employer'} sent you ${amount} ${row.currency}`,
    row.note || 'Open Finances to withdraw.',
    '/app/finances',
  )
  return c.json({ entry: row })
})

app.get('/api/career', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  await hydrateApplications({ userId: user.id })
  const profile = await loadProfile(user)
  const apps = memory.getApplications(user.id)
  const matches = memory.getMatches(user.id)
  const rows = apps.map((a) => ({
    status: a.status,
    title: memory.getJob(a.jobId)?.title ?? matches.find((m) => m.job.id === a.jobId)?.job.title ?? '',
  }))
  const local = careerInsights(rows, profile, matches)
  return c.json(await strategizeCareer(local, profile, rows))
})

app.get('/api/interview', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const jobId = c.req.query('jobId')
  const matches = memory.getMatches(user.id)
  const match = (jobId ? matches.find((m) => m.job.id === jobId) : matches[0]) ?? null
  if (!match) return c.json({ error: 'Run the job agent first.' }, 404)
  const profile = await loadProfile(user)
  const localQs = interviewQuestions(match, profile)
  const coached = await coachInterview(match, profile, localQs)
  return c.json({
    job: { id: match.job.id, title: match.job.title, company: match.job.company },
    matchedSkills: match.matchedSkills,
    ...coached,
  })
})

function originFromReferer(referer?: string) {
  if (!referer) return undefined
  try {
    return new URL(referer).origin
  } catch {
    return undefined
  }
}

app.get('/api/billing/plans', async (c) => {
  const user = await auth(c)
  const profile = user ? await loadProfile(user) : null
  const role: BillingRole = profile?.role === 'employer' ? 'employer' : 'candidate'
  return c.json({
    role,
    plans: plansFor(role),
    catalog: PLANS,
    providers: billingConfigured(),
  })
})

app.get('/api/billing/subscription', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  const role: BillingRole = profile.role === 'employer' ? 'employer' : 'candidate'
  if (role === 'employer') await startEmployerPromo(user.id)
  const subscription = await loadSubscription(user.id, role)
  return c.json({
    subscription,
    plan: planById(subscription.planId) ?? planById(defaultPlanId(role)),
    providers: billingConfigured(),
    role,
  })
})

app.post('/api/billing/checkout', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  const role: BillingRole = profile.role === 'employer' ? 'employer' : 'candidate'
  const body = (await c.req.json()) as {
    planId?: string
    interval?: BillingInterval
    provider?: BillingProvider | 'card'
  }
  const planId = String(body.planId ?? '')
  const plan = planById(planId)
  if (!plan || plan.role !== role) return c.json({ error: 'That plan is not available for this account.' }, 400)
  const interval: BillingInterval = 'year'
  const provider = body.provider === 'paypal' ? 'paypal' : 'stripe'
  const origin = appOrigin(c.req.header('Origin') ?? originFromReferer(c.req.header('Referer')))
  const returnPath = role === 'employer' ? '/employer/billing' : '/app/billing'
  const successUrl = `${origin}${returnPath}?status=success&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}${returnPath}?status=cancel`
  const paypalReturn = `${origin}${returnPath}?status=success&provider=paypal`

  if (!isPaidPlan(planId)) {
    const subscription = await activateSubscription(user.id, planId, interval, 'demo')
    return c.json({ url: `${origin}${returnPath}?status=success&demo=1`, demo: true, subscription })
  }

  const configured = billingConfigured()
  if (provider === 'stripe' && !configured.stripe) {
    const subscription = await activateSubscription(user.id, planId, interval, 'demo')
    return c.json({
      url: `${origin}${returnPath}?status=success&demo=1`,
      demo: true,
      subscription,
      note: 'Add STRIPE_SECRET_KEY to charge real cards. Demo subscription is active on this machine.',
    })
  }
  if (provider === 'paypal' && !configured.paypal) {
    const subscription = await activateSubscription(user.id, planId, interval, 'demo')
    return c.json({
      url: `${origin}${returnPath}?status=success&demo=1`,
      demo: true,
      subscription,
      note: 'Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET for live PayPal. Demo subscription is active on this machine.',
    })
  }

  try {
    if (provider === 'paypal') {
      const checkout = await createPayPalCheckout({
        userId: user.id,
        planId,
        interval,
        returnUrl: paypalReturn,
        cancelUrl,
      })
      return c.json({ url: checkout.url, provider: 'paypal', subscriptionId: checkout.subscriptionId })
    }
    const checkout = await createStripeCheckout({
      userId: user.id,
      email: profile.email || user.email,
      planId,
      interval,
      successUrl,
      cancelUrl,
    })
    return c.json({ url: checkout.url, provider: 'stripe', sessionId: checkout.sessionId })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Checkout failed.' }, 400)
  }
})

app.post('/api/billing/confirm', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  const role: BillingRole = profile.role === 'employer' ? 'employer' : 'candidate'
  const body = (await c.req.json().catch(() => ({}))) as {
    provider?: string
    sessionId?: string
    subscriptionId?: string
    demo?: boolean
    planId?: string
    interval?: BillingInterval
  }
  try {
    if (body.sessionId && billingConfigured().stripe) {
      const next = await confirmStripeSession(body.sessionId)
      if (next) return c.json({ subscription: next })
    }
    if (body.subscriptionId && billingConfigured().paypal) {
      const next = await confirmPayPalSubscription(body.subscriptionId)
      if (next) return c.json({ subscription: next })
    }
    if (body.demo && body.planId && isPaidPlan(body.planId)) {
      const next = await activateSubscription(user.id, body.planId, 'year', 'demo')
      return c.json({ subscription: next })
    }
    return c.json({ subscription: await loadSubscription(user.id, role) })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Could not confirm payment.' }, 400)
  }
})

app.post('/api/billing/cancel', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  const role: BillingRole = profile.role === 'employer' ? 'employer' : 'candidate'
  return c.json({ subscription: await cancelSubscription(user.id, role) })
})

app.post('/api/billing/webhook/stripe', async (c) => {
  const raw = await c.req.text()
  try {
    await handleStripeWebhook(raw, c.req.header('stripe-signature'))
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Webhook failed' }, 400)
  }
})

app.get('/api/router', (c) => c.json({ lanes: routerStatus(), diagram: true }))

app.get('/api/setup', (c) =>
  c.json({
    supabase: Boolean(supabaseAdmin),
    openai: Boolean(process.env.OPENAI_API_KEY),
    demo: !supabaseAdmin,
    router: routerStatus(),
  }),
)

async function loadLiveJobs(): Promise<Job[]> {
  if (!supabaseAdmin) return memory.allJobs()
  const { data, error } = await supabaseAdmin.from('jobs').select('*').limit(400)
  if (error) {
    console.warn('loadLiveJobs', error.message)
    return memory.allJobs()
  }
  return (data ?? []).map((row) => jobFromRow(row as Record<string, unknown>))
}

async function loadInviteJobs(): Promise<Job[]> {
  const byId = new Map<string, Job>()
  for (const job of JOB_CATALOG) byId.set(job.id, job)
  for (const job of memory.allJobs()) byId.set(job.id, job)
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('jobs').select('*').limit(400)
    if (error) console.warn('loadInviteJobs', error.message)
    for (const row of data ?? []) {
      const job = jobFromRow(row as Record<string, unknown>)
      byId.set(job.id, job)
    }
  }
  return [...byId.values()]
}

function inviteCompanies(jobs: Job[]) {
  const map = new Map<string, { company: string; title: string; source: string; listings: number; sources: string[] }>()
  for (const job of jobs) {
    if (isAtelierJob(job) || !job.company.trim()) continue
    const key = job.company.trim().toLowerCase()
    const cur = map.get(key)
    if (cur) {
      cur.listings += 1
      if (!cur.sources.includes(job.source)) cur.sources.push(job.source)
    } else {
      map.set(key, {
        company: job.company.trim(),
        title: job.title,
        source: job.source,
        listings: 1,
        sources: [job.source],
      })
    }
  }
  return [...map.values()].sort((a, b) => a.company.localeCompare(b.company))
}

app.get('/api/admin/dashboard', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (!isStaffRole(profile.role)) return c.json({ error: 'Admin account required' }, 403)

  const jobs = await loadLiveJobs()
  const invites = inviteCompanies(jobs)

  let accounts: {
    id: string
    email: string
    name: string
    role: AccountRole
    companyName: string
    joinedAt: string
    industry: string
    city: string
    country: string
    website: string
    onboarded: boolean
  }[] = []

  if (supabaseAdmin) {
    let { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, first_name, last_name, company_name, created_at, industry, city, country, company_website, onboarding_completed')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error && /industry|city|country|company_website|onboarding_completed|created_at/.test(error.message)) {
      const retry = await supabaseAdmin
        .from('profiles')
        .select('id, email, role, first_name, last_name, company_name, created_at')
        .limit(200)
      data = retry.data as typeof data
      error = retry.error
    }
    if (error) console.warn('admin accounts', error.message)
    accounts = (data ?? []).map((row) => {
      const role = parseAccountRole(row.role)
      const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
      return {
        id: String(row.id),
        email: String(row.email ?? ''),
        name: name || String(row.email ?? 'Account'),
        role,
        companyName: String(row.company_name ?? ''),
        joinedAt: row.created_at ? String(row.created_at) : '',
        industry: String(row.industry ?? ''),
        city: String(row.city ?? ''),
        country: String(row.country ?? ''),
        website: String(row.company_website ?? ''),
        onboarded: Boolean(row.onboarding_completed),
      }
    })
  }

  let packets = 0
  let hired = 0
  let jobCount = jobs.length
  let appRows: {
    id: string
    status: string
    jobId: string
    userId: string
    createdAt: string
    submittedAt: string
    coverLetter: string
    channel: string
  }[] = []
  let sessionRows = supabaseAdmin ? [] : memory.allTrackerSessions()
  let ledgerRows = supabaseAdmin ? [] : memory.allLedger()
  let inboxRecent: { id: string; body: string; at: string; applicationId: string; senderRole: string }[] = []
  let messageCount = 0
  let inviteRows: {
    id: string
    email: string
    name: string
    role: string
    status: 'pending' | 'accepted'
    invitedAt: string
  }[] = supabaseAdmin
    ? []
    : memory.allStaffInvites().map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: row.status,
        invitedAt: row.invitedAt,
      }))
  let activity: { kind: 'person' | 'invite'; title: string; body: string; at: string }[] = []

  if (supabaseAdmin) {
    const [packetRes, hiredRes, jobRes, appsRes, sessionsRes, ledRes, msgCountRes, msgsRes, invitedRes, notesRes] = await Promise.all([
      supabaseAdmin.from('applications').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('applications').select('id', { count: 'exact', head: true }).in('status', ['hired', 'offer']),
      supabaseAdmin.from('jobs').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('applications').select('id, status, job_id, user_id, created_at, submitted_at, cover_letter, channel').order('created_at', { ascending: false }).limit(120),
      supabaseAdmin.from('ateliar_sessions').select('*').order('started_at', { ascending: false }).limit(80),
      supabaseAdmin.from('ledger_entries').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('thread_messages').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('thread_messages').select('id, body, created_at, application_id, sender_role').order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('staff_invites').select('*').order('invited_at', { ascending: false }).limit(100),
      supabaseAdmin.from('notifications').select('title, body, created_at').order('created_at', { ascending: false }).limit(8),
    ])
    if (packetRes.error) console.warn('admin packets', packetRes.error.message)
    else packets = packetRes.count ?? 0
    if (hiredRes.error) console.warn('admin hired', hiredRes.error.message)
    else hired = hiredRes.count ?? 0
    if (jobRes.error) console.warn('admin jobs', jobRes.error.message)
    else jobCount = jobRes.count ?? jobCount
    if (appsRes.error) console.warn('admin applications', appsRes.error.message)
    else {
      appRows = (appsRes.data ?? []).map((row) => ({
        id: String(row.id),
        status: String(row.status ?? ''),
        jobId: String(row.job_id ?? ''),
        userId: String(row.user_id ?? ''),
        createdAt: row.created_at ? String(row.created_at) : '',
        submittedAt: row.submitted_at ? String(row.submitted_at) : '',
        coverLetter: String(row.cover_letter ?? '').slice(0, 400),
        channel: String(row.channel ?? ''),
      }))
    }
    if (sessionsRes.error) console.warn('admin tracker', sessionsRes.error.message)
    else sessionRows = (sessionsRes.data ?? []).map((row) => sessionFromRow(row as Record<string, unknown>))
    if (ledRes.error) console.warn('admin ledger', ledRes.error.message)
    else ledgerRows = (ledRes.data ?? []).map((row) => ledgerFromRow(row as Record<string, unknown>))
    if (msgCountRes.error) console.warn('admin messages', msgCountRes.error.message)
    else messageCount = msgCountRes.count ?? 0
    if (msgsRes.error) console.warn('admin inbox', msgsRes.error.message)
    else {
      inboxRecent = (msgsRes.data ?? []).map((row) => ({
        id: String(row.id),
        body: String(row.body ?? ''),
        at: row.created_at ? String(row.created_at) : '',
        applicationId: String(row.application_id ?? ''),
        senderRole: String(row.sender_role ?? ''),
      }))
    }
    if (invitedRes.error) console.warn('admin staff invites', invitedRes.error.message)
    else {
      inviteRows = (invitedRes.data ?? []).map((row) => ({
        id: String(row.id),
        email: String(row.email ?? '').toLowerCase(),
        name: String(row.email ?? '').split('@')[0] || 'Admin',
        role: 'admin',
        status: row.status === 'accepted' ? 'accepted' : 'pending',
        invitedAt: row.invited_at ? String(row.invited_at) : new Date().toISOString(),
      }))
    }
    if (!notesRes.error && notesRes.data?.length) {
      activity = notesRes.data.map((row) => ({
        kind: 'person' as const,
        title: String(row.title ?? 'Update'),
        body: String(row.body ?? ''),
        at: row.created_at ? String(row.created_at) : '',
      }))
    }
  }

  const peopleById = new Map(accounts.map((row) => [row.id, row]))
  const jobsById = new Map(jobs.map((job) => [job.id, job]))

  const packetsList = appRows.map((row) => {
    const job = jobsById.get(row.jobId)
    const person = peopleById.get(row.userId)
    return {
      id: row.id,
      status: row.status,
      jobTitle: job?.title ?? 'Role',
      company: job?.company ?? '',
      candidate: person?.name || person?.email || 'Candidate',
      candidateEmail: person?.email ?? '',
      createdAt: row.createdAt,
      submittedAt: row.submittedAt || row.createdAt,
      coverLetter: row.coverLetter,
      channel: row.channel,
      atelier: Boolean(job?.employerId || job?.source === 'atelier'),
      location: job?.location ?? '',
      postedAt: job?.postedAt ?? '',
    }
  })

  const trackerSessions = sessionRows.map((row) => {
    const person = peopleById.get(row.candidateId)
    const liveClock = !row.endedAt
    const seconds = sessionSeconds(row)
    return {
      id: row.id,
      jobTitle: row.jobTitle,
      company: row.company,
      candidate: person?.name || person?.email || 'Candidate',
      startedAt: row.startedAt,
      endedAt: row.endedAt ?? '',
      seconds,
      live: liveClock,
    }
  })
  const tracker = {
    live: trackerSessions.filter((row) => row.live).length,
    hours: trackerSessions.reduce((n, row) => n + row.seconds, 0),
    sessions: trackerSessions.slice(0, 40),
  }

  const financeOverview = summarizeLedger(ledgerRows)
  const finance = {
    received: financeOverview.received,
    pending: financeOverview.pending,
    available: financeOverview.available,
    withdrawn: financeOverview.withdrawn,
    currency: financeOverview.currency,
    entries: financeOverview.entries.slice(0, 40).map((row) => ({
      id: row.id,
      company: row.company ?? '',
      jobTitle: row.jobTitle ?? '',
      amount: row.amount,
      status: row.status,
      kind: row.kind,
      createdAt: row.createdAt,
    })),
  }

  const inbox = {
    messages: messageCount || inboxRecent.length,
    threads: new Set(inboxRecent.map((row) => row.applicationId)).size,
    recent: inboxRecent,
  }

  const boardMap = new Map<string, number>()
  for (const job of jobs) boardMap.set(job.source, (boardMap.get(job.source) ?? 0) + 1)
  const boards = [...boardMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  const listings = [...jobs]
    .sort((a, b) => String(b.postedAt ?? '').localeCompare(String(a.postedAt ?? '')))
    .slice(0, 80)
    .map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      source: job.source,
      remote: Boolean(job.remote),
      postedAt: job.postedAt ?? '',
      atelier: Boolean(job.employerId || job.source === 'atelier'),
    }))

  if (!activity.length) {
    activity = [
      ...accounts.slice(0, 4).map((row) => ({
        kind: 'person' as const,
        title: row.name,
        body: `${row.role.replace('_', ' ')} · ${row.email}`,
        at: row.joinedAt,
      })),
      ...invites.slice(0, 4).map((row) => ({
        kind: 'invite' as const,
        title: row.company,
        body: `${row.listings} listing${row.listings === 1 ? '' : 's'} waiting on ${row.sources[0] ?? 'a board'}`,
        at: '',
      })),
    ]
  }

  const counts = {
    candidates: accounts.filter((a) => a.role === 'candidate').length,
    employers: accounts.filter((a) => a.role === 'employer').length,
    admins: accounts.filter((a) => isStaffRole(a.role)).length,
    jobs: jobCount,
    companiesToInvite: invites.length,
    packets,
    people: accounts.length,
    hired,
    messages: inbox.messages,
    liveClocks: tracker.live,
    trackerHours: tracker.hours,
    financeReceived: finance.received,
  }

  const staffSeen = new Set<string>()
  const staffInvites: {
    id: string
    email: string
    name: string
    role: string
    status: 'pending' | 'accepted'
    invitedAt: string
  }[] = []
  for (const row of inviteRows) {
    if (staffSeen.has(row.email)) continue
    staffSeen.add(row.email)
    staffInvites.push(row)
  }
  for (const row of accounts.filter((a) => isStaffRole(a.role))) {
    const email = row.email.toLowerCase()
    if (staffSeen.has(email)) {
      const hit = staffInvites.find((s) => s.email === email)
      if (hit) {
        hit.status = 'accepted'
        hit.name = row.name || hit.name
        hit.role = row.role
      }
      continue
    }
    staffSeen.add(email)
    staffInvites.push({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: 'accepted',
      invitedAt: row.joinedAt,
    })
  }
  staffInvites.sort((a, b) => String(b.invitedAt).localeCompare(String(a.invitedAt)))

  const spendByEmployer = new Map<string, number>()
  for (const row of ledgerRows) {
    if (!row.employerId || row.kind !== 'from_employer') continue
    spendByEmployer.set(row.employerId, (spendByEmployer.get(row.employerId) ?? 0) + row.amount)
  }
  const jobsByEmployer = new Map<string, typeof jobs>()
  for (const job of jobs) {
    const key = job.employerId || ''
    if (!key) continue
    const list = jobsByEmployer.get(key) ?? []
    list.push(job)
    jobsByEmployer.set(key, list)
  }
  const packetByJob = new Map<string, { packets: number; hired: number }>()
  for (const row of appRows) {
    const cur = packetByJob.get(row.jobId) ?? { packets: 0, hired: 0 }
    cur.packets += 1
    if (isHiredStatus(row.status)) cur.hired += 1
    packetByJob.set(row.jobId, cur)
  }
  const employers = accounts
    .filter((row) => row.role === 'employer')
    .map((row) => {
      const mine = jobsByEmployer.get(row.id) ?? []
      const companyKey = row.companyName.trim().toLowerCase()
      const extras = companyKey
        ? jobs.filter((job) => !job.employerId && job.source === 'atelier' && job.company.trim().toLowerCase() === companyKey)
        : []
      const allMine = [...mine, ...extras.filter((job) => !mine.some((m) => m.id === job.id))]
      let packetsFor = 0
      let hiredFor = 0
      for (const job of allMine) {
        const hit = packetByJob.get(job.id)
        if (!hit) continue
        packetsFor += hit.packets
        hiredFor += hit.hired
      }
      const status = allMine.length ? 'active' : row.onboarded ? 'active' : 'pending'
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        company: row.companyName || row.name,
        industry: row.industry,
        city: row.city,
        country: row.country,
        website: row.website,
        joinedAt: row.joinedAt,
        jobs: allMine.length,
        packets: packetsFor,
        hired: hiredFor,
        spent: spendByEmployer.get(row.id) ?? 0,
        status,
      }
    })

  return c.json({
    live: Boolean(supabaseAdmin),
    role: profile.role,
    email: profile.email,
    name: displayName(profile),
    counts,
    accounts,
    employers,
    invites,
    boards,
    listings,
    activity,
    packetsList,
    tracker,
    finance,
    inbox,
    staffInvites,
    promoteSql: "update public.profiles set role = 'admin' where email = 'you@example.com';",
  })
})

app.patch('/api/admin/packets/:id', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (!isStaffRole(profile.role)) return c.json({ error: 'Admin account required' }, 403)
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) as { status?: string }
  const next = String(body.status ?? '').trim()
  const allowed = ['submitted', 'under_review', 'interview', 'offer', 'hired', 'rejected']
  if (!allowed.includes(next)) return c.json({ error: 'Use a studio packet status.' }, 400)
  const row = (await hydrateApplication(id)) ?? memory.getApplicationById(id)
  if (!row) return c.json({ error: 'Packet not found.' }, 404)
  row.status = next
  memory.addApplication(row)
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('applications').update({ status: next }).eq('id', id)
    if (error) return c.json({ error: error.message }, 400)
  }
  const job = memory.getJob(row.jobId)
  const hired = isHiredStatus(next)
  await notifyUser(
    row.userId,
    hired ? `${job?.title ?? 'Role'} is hired — Atelier time tracker is open` : `${job?.title ?? 'Packet'} is now ${next.replaceAll('_', ' ')}`,
    hired
      ? `${job?.company ?? 'Atelier'} marked you hired. Open Atelier time tracker to log hours on this role.`
      : `Staff updated this packet to ${next.replaceAll('_', ' ')}.`,
    hired ? '/app/ateliar' : `/app/applications/${row.id}`,
  )
  return c.json({ ok: true, id, status: next })
})

app.post('/api/admin/role', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (profile.role !== 'super_admin') return c.json({ error: 'Super admin only' }, 403)
  if (!supabaseAdmin) return c.json({ error: 'Supabase is not connected.' }, 400)

  const body = (await c.req.json().catch(() => ({}))) as { email?: string; role?: string }
  const email = String(body.email ?? '').trim().toLowerCase()
  const next = parseAccountRole(body.role)
  if (!email || !email.includes('@')) return c.json({ error: 'Use a valid email.' }, 400)
  if (next === 'super_admin') return c.json({ error: 'Promote super admins in SQL only.' }, 400)

  const { data, error } = await supabaseAdmin.from('profiles').update({ role: next }).eq('email', email).select('id, email, role')
  if (error) return c.json({ error: error.message }, 400)
  if (!data?.length) return c.json({ error: 'No profile with that email.' }, 404)
  return c.json({ ok: true, account: data[0] })
})

app.post('/api/admin/invite', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (!isStaffRole(profile.role)) return c.json({ error: 'Admin account required' }, 403)
  if (!supabaseAdmin) return c.json({ error: 'Supabase is not connected.' }, 400)

  const body = (await c.req.json().catch(() => ({}))) as { email?: string; role?: string }
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) return c.json({ error: 'Use a valid email.' }, 400)
  if (body.role && body.role !== 'admin') return c.json({ error: 'Invite Admin grants the admin role only.' }, 400)

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, first_name, last_name')
    .eq('email', email)
    .maybeSingle()
  if (existingErr) return c.json({ error: existingErr.message }, 400)

  const now = new Date().toISOString()
  const name = existing
    ? `${existing.first_name ?? ''} ${existing.last_name ?? ''}`.trim() || email
    : email.split('@')[0] || 'Admin'

  if (existing && isStaffRole(parseAccountRole(existing.role))) {
    return c.json({ ok: true, status: 'accepted', already: true, email })
  }

  if (existing) {
    const { error } = await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', existing.id)
    if (error) return c.json({ error: error.message }, 400)
    await supabaseAdmin.from('staff_invites').upsert(
      { email, role: 'admin', status: 'accepted', invited_by: user.id, invited_at: now, accepted_at: now },
      { onConflict: 'email' },
    )
    memory.addStaffInvite({
      id: String(existing.id),
      email,
      name,
      role: 'admin',
      status: 'accepted',
      invitedAt: now,
      invitedBy: user.id,
    })
    await notifyUser(String(existing.id), 'You are an Atelier admin', 'You can open the admin desk to invite employers, review packets, and manage the studio.', '/admin')
    return c.json({ ok: true, status: 'accepted', email })
  }

  const invite: StaffInvite = {
    id: crypto.randomUUID(),
    email,
    name,
    role: 'admin',
    status: 'pending',
    invitedAt: now,
    invitedBy: user.id,
  }
  const { error: saveErr } = await supabaseAdmin.from('staff_invites').upsert(
    { id: invite.id, email, role: 'admin', status: 'pending', invited_by: user.id, invited_at: now },
    { onConflict: 'email' },
  )
  if (saveErr) console.warn('staff invite row', saveErr.message)
  memory.addStaffInvite(invite)

  let mailed = false
  try {
    const origin = appOrigin(c.req.header('Origin') ?? undefined)
    const sent = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/register` })
    mailed = !sent.error
    if (sent.error) console.warn('staff invite email', sent.error.message)
  } catch (err) {
    console.warn('staff invite email', err)
  }

  return c.json({
    ok: true,
    status: 'pending',
    email,
    mailed,
    message: mailed
      ? 'Invitation sent. They set up their account from the email.'
      : 'Saved. They become admin when they create an Atelier account with this email.',
  })
})

app.post('/api/admin/invite/cancel', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const profile = await loadProfile(user)
  if (!isStaffRole(profile.role)) return c.json({ error: 'Admin account required' }, 403)
  const body = (await c.req.json().catch(() => ({}))) as { email?: string }
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email) return c.json({ error: 'Email required' }, 400)
  const row = memory.getStaffInvite(email)
  if (row?.status === 'accepted') return c.json({ error: 'That admin is already on the desk.' }, 400)
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('staff_invites').delete().eq('email', email).eq('status', 'pending')
    if (error) return c.json({ error: error.message }, 400)
  }
  memory.removeStaffInvite(email)
  return c.json({ ok: true })
})

const seeded = emptyProfile()
seeded.email = 'demo@atelier.local'
seeded.firstName = 'Jordan'
seeded.lastName = 'Reyes'
seeded.headline = 'Full stack engineer'
seeded.currentTitle = 'Full Stack Engineer'
seeded.desiredTitle = 'Full Stack Engineer'
seeded.yearsExperience = 5
seeded.skills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Next.js']
seeded.aiSkills = ['GPT', 'RAG']
seeded.remoteWorldwide = true
seeded.workModes = ['remote']
seeded.employmentTypes = ['full-time']
seeded.resumeText =
  'Jordan Reyes\nFull Stack Engineer\nReact, TypeScript, Node.js, PostgreSQL.\nBuilt matching, packets, and hiring inboxes.'
seeded.parsedProfile = {
  name: 'Jordan Reyes',
  headline: 'Full Stack Engineer',
  experience_years: 5,
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Next.js'],
  ai_skills: ['GPT', 'RAG'],
  industries: ['Software'],
}
seeded.onboardingCompleted = true
memory.setProfile(DEMO_USER, seeded)

const hiring = emptyProfile()
hiring.email = 'hiring@atelier.local'
hiring.firstName = 'Sam'
hiring.lastName = 'Chen'
hiring.role = 'employer'
hiring.companyName = 'Atelier Labs'
hiring.companyWebsite = 'https://atelier.local'
hiring.onboardingCompleted = true
memory.setProfile(DEMO_EMPLOYER, hiring)

const demoRole = asJob({
  id: 'atelier-demo-fullstack',
  source: 'atelier',
  sourceJobId: 'atelier-demo-fullstack',
  title: 'Full Stack Engineer',
  company: 'Atelier Labs',
  description:
    'Atelier Labs is hiring a full stack engineer to build product with React, Next.js, TypeScript, Node.js, and PostgreSQL. Remote worldwide. You will ship candidate matching, application packets, and the employer inbox. Experience with AI-assisted product work is a plus.',
  location: 'Remote worldwide',
  remote: true,
  employmentType: 'full-time',
  salaryMin: 90000,
  salaryMax: 140000,
  currency: 'USD',
  skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL'],
  requiredSkills: ['React', 'TypeScript', 'Node.js'],
  requiredExperience: 4,
  seniority: 'senior',
  applicationUrl: '/app/jobs/atelier-demo-fullstack',
  applyChannel: 'Atelier — sent to employer',
  postedAt: new Date().toISOString().slice(0, 10),
  employerId: DEMO_EMPLOYER,
})
memory.setJobs([demoRole])
memory.setMatches(DEMO_USER, matchJobs([demoRole], seeded))

const demoAppId = 'a0000000-0000-4000-8000-000000000001'
memory.addApplication({
  id: demoAppId,
  userId: DEMO_USER,
  jobId: demoRole.id,
  status: 'hired',
  channel: 'Atelier employer inbox',
  authorized: true,
  deliveredToEmployer: true,
  submittedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  packet: {
    tailoredResume:
      'Jordan Reyes\nFull Stack Engineer\n\nReact, TypeScript, Node.js, PostgreSQL.\nBuilt matching, packets, and hiring inboxes.',
    coverLetter:
      'I am applying for Full Stack Engineer at Atelier Labs. I want to ship candidate matching and employer inboxes with care — packets leave only after the candidate approves.',
    answers: [{ question: 'Why this role?', answer: 'I want to help people apply without spraying templates at every board.' }],
    recruiterMessage: '',
    resumeNotes: { confirmed: ['React', 'TypeScript', 'Node.js'], unconfirmed: [] },
  },
  events: [
    {
      at: new Date().toISOString(),
      label: 'Sent to employer',
      detail: 'Packet delivered to Atelier Labs on Atelier.',
    },
  ],
  followUps: [],
  recruiterSent: false,
  candidateName: 'Jordan Reyes',
  candidateEmail: 'demo@atelier.local',
  candidateHeadline: 'Full stack engineer',
})
memory.addMessage({
  id: 'a0000000-0000-4000-8000-000000000011',
  applicationId: demoAppId,
  senderId: DEMO_USER,
  senderRole: 'candidate',
  body: 'Hi Sam — I sent my packet for the Full Stack role. Happy to walk through the matching and packet work whenever you have time.',
  createdAt: new Date().toISOString(),
})
memory.addTrackerSession({
  id: 'a0000000-0000-4000-8000-000000000031',
  candidateId: DEMO_USER,
  employerId: DEMO_EMPLOYER,
  applicationId: demoAppId,
  jobTitle: 'Full Stack Engineer',
  company: 'Atelier Labs',
  startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  endedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  seconds: 3600,
  note: 'Shipped matching work.',
})
memory.addLedger({
  id: 'a0000000-0000-4000-8000-000000000021',
  candidateId: DEMO_USER,
  employerId: DEMO_EMPLOYER,
  applicationId: demoAppId,
  jobTitle: 'Full Stack Engineer',
  company: 'Atelier Labs',
  kind: 'from_employer',
  status: 'available',
  amount: 2400,
  currency: 'USD',
  note: 'First milestone for matching work.',
  createdAt: new Date().toISOString(),
})

export { app }

const hosted = Boolean(
  process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT,
)
const isLocalEntry = /server\/index\.(ts|js|mts|mjs)$/.test(process.argv[1] ?? '')

if (!hosted && isLocalEntry) {
  void import('@hono/node-server').then(({ serve }) => {
    const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
      console.log(`API http://127.0.0.1:${port}  supabase=${Boolean(supabaseAdmin)}`)
    })
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the other API (kill the old npm run dev) and start again.`)
        process.exit(1)
      }
      throw err
    })
  })
}
