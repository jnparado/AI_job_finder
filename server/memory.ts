import type { CandidateProfile, Job, JobMatch, PreparedPacket } from '../shared/types'
import { emptyProfile } from '../shared/types'

export const DEMO_USER = '00000000-0000-0000-0000-000000000001'

export interface StoredApplication {
  id: string
  userId: string
  jobId: string
  status: string
  channel: string
  authorized: boolean
  packet: PreparedPacket
  submittedAt?: string
  createdAt: string
  events: { at: string; label: string; detail: string }[]
  followUps: { dayOffset: number; title: string; body: string; sent: boolean }[]
  recruiterSent: boolean
}

export interface StoredNotification {
  id: string
  userId: string
  title: string
  body: string
  href?: string
  read: boolean
  createdAt: string
}

export interface AgentSettings {
  enabled: boolean
  runHour: number
  minMatch: number
  maxJobs: number
}

const profiles = new Map<string, CandidateProfile>()
const matches = new Map<string, JobMatch[]>()
const applications = new Map<string, StoredApplication[]>()
const notifications = new Map<string, StoredNotification[]>()
const settings = new Map<string, AgentSettings>()
const jobs = new Map<string, Job>()

export const memory = {
  getProfile(userId: string) {
    return profiles.get(userId) ?? { ...emptyProfile(), email: '' }
  },
  setProfile(userId: string, profile: CandidateProfile) {
    profiles.set(userId, { ...profile, id: userId })
    return memory.getProfile(userId)
  },
  setJobs(list: Job[]) {
    for (const job of list) jobs.set(job.id, job)
  },
  getJob(id: string) {
    return jobs.get(id)
  },
  allJobs() {
    return [...jobs.values()]
  },
  setMatches(userId: string, list: JobMatch[]) {
    matches.set(userId, list)
  },
  getMatches(userId: string) {
    return matches.get(userId) ?? []
  },
  addApplication(app: StoredApplication) {
    const list = applications.get(app.userId) ?? []
    applications.set(app.userId, [app, ...list.filter((a) => a.id !== app.id)])
  },
  getApplications(userId: string) {
    return applications.get(userId) ?? []
  },
  getApplication(userId: string, id: string) {
    return (applications.get(userId) ?? []).find((a) => a.id === id)
  },
  addNotification(n: StoredNotification) {
    const list = notifications.get(n.userId) ?? []
    notifications.set(n.userId, [n, ...list])
  },
  getNotifications(userId: string) {
    return notifications.get(userId) ?? []
  },
  getSettings(userId: string): AgentSettings {
    return (
      settings.get(userId) ?? {
        enabled: false,
        runHour: 8,
        minMatch: 80,
        maxJobs: 20,
      }
    )
  },
  setSettings(userId: string, next: AgentSettings) {
    settings.set(userId, next)
    return next
  },
}
