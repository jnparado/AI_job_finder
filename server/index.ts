import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { careerInsights, followUps, interviewQuestions, preparePacket } from '../shared/engine/packets'
import { matchJobs } from '../shared/engine/matcher'
import { normalizeAndDedupe } from '../shared/engine/normalize'
import { JOB_CATALOG } from '../shared/jobs'
import type { CandidateProfile, JobMatch } from '../shared/types'
import { emptyProfile } from '../shared/types'
import { DEMO_USER, memory, type StoredApplication } from './memory'
import { extractFileText, parseResumeSmart } from './resume'
import { supabaseAdmin, supabaseAuth } from './supabase'

const app = new Hono()
const port = Number(process.env.API_PORT ?? 8787)

app.use(
  '*',
  cors({
    origin: process.env.APP_URL ?? 'http://localhost:5173',
    allowHeaders: ['Authorization', 'Content-Type'],
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
  if (!supabaseAuth) return null
  const { data } = await supabaseAuth.auth.getUser(token)
  if (!data.user) return null
  return { id: data.user.id, email: data.user.email ?? '' }
}

function profileFromRow(row: Record<string, unknown>, email: string): CandidateProfile {
  const parsed = (row.parsed_profile as CandidateProfile['parsedProfile']) ?? null
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
  }
}

async function loadProfile(user: AuthUser): Promise<CandidateProfile> {
  if (supabaseAdmin) {
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
  }
  const mem = memory.getProfile(user.id)
  if (!mem.email) mem.email = user.email
  return mem
}

async function saveProfile(user: AuthUser, profile: CandidateProfile) {
  memory.setProfile(user.id, profile)
  if (!supabaseAdmin) return profile
  await supabaseAdmin.from('profiles').upsert({
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
    parsed_profile: profile.parsedProfile,
  })
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
  for (const job of jobs) {
    await supabaseAdmin.from('jobs').upsert({
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
    })
    if (job.sources?.length) {
      await supabaseAdmin.from('job_listings').delete().eq('job_id', job.id)
      await supabaseAdmin.from('job_listings').insert(
        job.sources.map((s) => ({
          job_id: job.id,
          source: s.source,
          source_url: s.url,
        })),
      )
    }
  }
}

async function persistMatches(userId: string, list: JobMatch[]) {
  memory.setMatches(userId, list)
  if (!supabaseAdmin) return
  for (const m of list) {
    await supabaseAdmin.from('job_matches').upsert({
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
    }, { onConflict: 'user_id,job_id' })
  }
}

async function runSearch(user: AuthUser, minMatch = 0, maxJobs = 40) {
  const profile = await loadProfile(user)
  const { jobs, duplicatesRemoved } = normalizeAndDedupe(JOB_CATALOG)
  await persistJobs(jobs)
  const all = matchJobs(jobs, profile)
  const filtered = all.filter((m) => m.score >= minMatch).slice(0, maxJobs)
  await persistMatches(user.id, all)
  const counts = {
    excellent: all.filter((m) => m.category === 'excellent').length,
    strong: all.filter((m) => m.category === 'strong').length,
    good: all.filter((m) => m.category === 'good').length,
    possible: all.filter((m) => m.category === 'possible').length,
    poor: all.filter((m) => m.category === 'poor').length,
  }
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
        stats: { discovered: JOB_CATALOG.length, duplicatesRemoved, scored: all.length, counts },
      })
    }
  }
  return { jobs, duplicatesRemoved, matches: filtered, all, counts }
}

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    supabase: Boolean(supabaseAdmin),
    openai: Boolean(process.env.OPENAI_API_KEY),
  }),
)

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
  return c.json(await saveProfile(user, next))
})

app.post('/api/resume/upload', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return c.json({ error: 'file required' }, 400)
  const buffer = Buffer.from(await file.arrayBuffer())
  const text = await extractFileText(buffer, file.type, file.name)
  const parsed = await parseResumeSmart(text)
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
  }
  if (parsed.name && !profile.firstName) {
    const [first, ...rest] = parsed.name.split(' ')
    merged.firstName = first
    merged.lastName = rest.join(' ')
  }
  await saveProfile(user, merged)
  if (supabaseAdmin) {
    const path = `${user.id}/${Date.now()}-${file.name}`
    await supabaseAdmin.storage.from('resumes').upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })
    await supabaseAdmin.from('resumes').insert({
      user_id: user.id,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      extracted_text: text,
      parsed,
      is_primary: true,
    })
  }
  return c.json({ text, parsed, profile: merged })
})

app.post('/api/resume/parse-text', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { text } = (await c.req.json()) as { text: string }
  const parsed = await parseResumeSmart(text ?? '')
  return c.json({ parsed })
})

app.post('/api/agent/search', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const body = (await c.req.json().catch(() => ({}))) as { minMatch?: number; maxJobs?: number }
  const result = await runSearch(user, body.minMatch ?? 0, body.maxJobs ?? 50)
  return c.json({
    discovered: JOB_CATALOG.length,
    normalized: result.jobs.length,
    duplicatesRemoved: result.duplicatesRemoved,
    counts: result.counts,
    matches: result.all,
  })
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
  const match = memory.getMatches(user.id).find((m) => m.job.id === id)
  if (!match) return c.json({ error: 'Not found' }, 404)
  return c.json(match)
})

app.post('/api/applications', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { jobId } = (await c.req.json()) as { jobId: string }
  const profile = await loadProfile(user)
  const match = memory.getMatches(user.id).find((m) => m.job.id === jobId)
  if (!match) return c.json({ error: 'Match not found. Run search first.' }, 404)
  const existing = memory.getApplications(user.id).find((a) => a.jobId === jobId && a.status === 'draft')
  if (existing) return c.json(existing)
  const packet = preparePacket(match, profile)
  const appRow: StoredApplication = {
    id: crypto.randomUUID(),
    userId: user.id,
    jobId,
    status: 'draft',
    channel: match.job.applyChannel ?? 'Authorized portal',
    authorized: false,
    packet,
    createdAt: new Date().toISOString(),
    events: [
      {
        at: new Date().toISOString(),
        label: 'Packet prepared',
        detail: 'Resume customized, cover letter and answers drafted. Nothing submitted.',
      },
    ],
    followUps: followUps(match, profile).map((f) => ({ ...f, sent: false })),
    recruiterSent: false,
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
  return c.json(memory.getApplications(user.id))
})

app.get('/api/applications/:id', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const row = memory.getApplication(user.id, c.req.param('id'))
  if (!row) return c.json({ error: 'Not found' }, 404)
  const match = memory.getMatches(user.id).find((m) => m.job.id === row.jobId)
  return c.json({
    ...row,
    match,
    interview: match ? interviewQuestions(match, await loadProfile(user)) : [],
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
  const match = memory.getMatches(user.id).find((m) => m.job.id === row.jobId)
  row.authorized = true
  row.status = 'submitted'
  row.submittedAt = new Date().toISOString()
  row.events.push({
    at: row.submittedAt,
    label: 'Authorized submission',
    detail: match?.job.applyChannel?.includes('Open listing')
      ? 'Materials ready. Open the official job page to submit yourself — no undocumented automation.'
      : `Submitted through ${row.channel}.`,
  })
  memory.addApplication(row)
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('applications')
      .update({
        authorized: true,
        status: 'submitted',
        submitted_at: row.submittedAt,
      })
      .eq('id', row.id)
  }
  return c.json({ application: row, openUrl: match?.job.applicationUrl })
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

app.get('/api/career', async (c) => {
  const user = await auth(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const apps = memory.getApplications(user.id)
  const matches = memory.getMatches(user.id)
  const insights = careerInsights(
    apps.map((a) => ({
      status: a.status,
      title: matches.find((m) => m.job.id === a.jobId)?.job.title ?? '',
    })),
  )
  return c.json(insights)
})

app.get('/api/setup', (c) =>
  c.json({
    supabase: Boolean(supabaseAdmin),
    openai: Boolean(process.env.OPENAI_API_KEY),
    demo: !supabaseAdmin,
  }),
)

const seeded = emptyProfile()
seeded.email = 'demo@atelier.local'
memory.setProfile(DEMO_USER, seeded)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API http://localhost:${port}  supabase=${Boolean(supabaseAdmin)}`)
})
