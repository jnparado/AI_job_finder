import type { Subscription } from '../shared/billing'
import type { LedgerEntry } from '../shared/finances'
import type { TrackerSession } from '../shared/tracker'
import type { CandidateProfile, DiscoverySummary, Job, JobMatch, PreparedPacket, ThreadMessage } from '../shared/types'
import { emptyProfile } from '../shared/types'

export const DEMO_USER = '00000000-0000-0000-0000-000000000001'
export const DEMO_EMPLOYER = '00000000-0000-0000-0000-000000000002'

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
  deliveredToEmployer?: boolean
  candidateName?: string
  candidateEmail?: string
  candidateHeadline?: string
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
const discovery = new Map<string, DiscoverySummary>()
const subscriptions = new Map<string, Subscription>()
const threadMessages = new Map<string, ThreadMessage[]>()
const ledger: LedgerEntry[] = []
const trackerSessions: TrackerSession[] = []

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
  getApplicationById(id: string) {
    for (const list of applications.values()) {
      const found = list.find((a) => a.id === id)
      if (found) return found
    }
    return undefined
  },
  allApplications() {
    return [...applications.values()].flat()
  },
  jobsForEmployer(employerId: string) {
    return [...jobs.values()].filter((job) => job.employerId === employerId)
  },
  atelierJobs() {
    return [...jobs.values()].filter((job) => job.source === 'atelier' || Boolean(job.employerId))
  },
  getMessages(applicationId: string) {
    return [...(threadMessages.get(applicationId) ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  setMessages(applicationId: string, list: ThreadMessage[]) {
    const byId = new Map<string, ThreadMessage>()
    for (const msg of list) byId.set(msg.id, msg)
    threadMessages.set(
      applicationId,
      [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    )
  },
  addMessage(msg: ThreadMessage) {
    const list = memory.getMessages(msg.applicationId)
    if (list.some((m) => m.id === msg.id)) return msg
    memory.setMessages(msg.applicationId, [...list, msg])
    return msg
  },
  markRead(applicationId: string, userId: string) {
    const now = new Date().toISOString()
    memory.setMessages(
      applicationId,
      memory.getMessages(applicationId).map((m) =>
        m.senderId === userId || m.readAt ? m : { ...m, readAt: now },
      ),
    )
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
  setDiscovery(userId: string, summary: DiscoverySummary) {
    discovery.set(userId, summary)
  },
  getDiscovery(userId: string) {
    return discovery.get(userId) ?? null
  },
  getSubscription(userId: string) {
    return subscriptions.get(userId)
  },
  setSubscription(row: Subscription) {
    subscriptions.set(row.userId, row)
    return row
  },
  addLedger(row: LedgerEntry) {
    const i = ledger.findIndex((e) => e.id === row.id)
    if (i >= 0) ledger[i] = row
    else ledger.unshift(row)
    return row
  },
  getLedgerForCandidate(candidateId: string) {
    return ledger.filter((e) => e.candidateId === candidateId)
  },
  getLedgerForEmployer(employerId: string) {
    return ledger.filter((e) => e.employerId === employerId)
  },
  addTrackerSession(row: TrackerSession) {
    const i = trackerSessions.findIndex((s) => s.id === row.id)
    if (i >= 0) trackerSessions[i] = row
    else trackerSessions.unshift(row)
    return row
  },
  getTrackerSessions(candidateId: string) {
    return trackerSessions.filter((s) => s.candidateId === candidateId)
  },
  getTrackerSession(id: string) {
    return trackerSessions.find((s) => s.id === id)
  },
  getTrackerForEmployer(employerId: string) {
    return trackerSessions.filter((s) => s.employerId === employerId)
  },
  allTrackerSessions() {
    return [...trackerSessions]
  },
  allLedger() {
    return [...ledger]
  },
}
