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
