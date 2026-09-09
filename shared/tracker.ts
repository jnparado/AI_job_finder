export function isHiredStatus(status: string) {
  return status === 'hired' || status === 'offer'
}

export interface TrackerSession {
  id: string
  candidateId: string
  employerId?: string
  applicationId: string
  jobTitle: string
  company: string
  startedAt: string
  endedAt?: string
  seconds: number
  note?: string
}

export function sessionSeconds(session: TrackerSession, now = Date.now()) {
  if (session.endedAt) return session.seconds
  const start = new Date(session.startedAt).getTime()
  return Math.max(0, Math.floor((now - start) / 1000) + session.seconds)
}

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatHoursMinutes(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export function formatClock(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatSheetDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function startOfLocalDay(now = Date.now()) {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function startOfLocalWeek(now = Date.now()) {
  const d = new Date(now)
  const offset = d.getDay() === 0 ? -6 : 1 - d.getDay()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset).getTime()
}

export function secondsInRange(rows: TrackerSession[], start: number, end: number, now = Date.now()) {
  return rows.reduce((n, row) => {
    const from = new Date(row.startedAt).getTime()
    const to = row.endedAt ? new Date(row.endedAt).getTime() : now
    return n + Math.max(0, Math.floor((Math.min(to, end) - Math.max(from, start)) / 1000))
  }, 0)
}

export function sessionsToCsv(rows: TrackerSession[]) {
  const header = 'Date,Company,Role,Started,Ended,Hours,Note'
  const lines = rows.map((row) => {
    const hours = (sessionSeconds(row) / 3600).toFixed(2)
    const cells = [
      row.startedAt.slice(0, 10),
      row.company,
      row.jobTitle,
      row.startedAt,
      row.endedAt ?? '',
      hours,
      row.note ?? '',
    ].map((v) => `"${String(v).replaceAll('"', '""')}"`)
    return cells.join(',')
  })
  return [header, ...lines].join('\n')
}
