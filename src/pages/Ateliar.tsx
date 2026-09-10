import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import {
  formatClock,
  formatHoursMinutes,
  formatSheetDate,
  secondsInRange,
  sessionSeconds,
  sessionsToCsv,
  startOfLocalDay,
  startOfLocalWeek,
  type TrackerSession,
} from '@shared/tracker'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface HiredRole {
  applicationId: string
  jobTitle: string
  company: string
  status: string
}

interface CandidateDesk {
  role: 'candidate'
  roles: HiredRole[]
  sessions: TrackerSession[]
  running: TrackerSession | null
}

interface EmployerDesk {
  role: 'employer'
  sessions: TrackerSession[]
}

const WAY_KEY = 'atelier-tracker-on-way'

export function AteliarPage() {
  const { profile } = useAuth()
  const q = useQuery({
    queryKey: ['ateliar'],
    queryFn: () => api<CandidateDesk | EmployerDesk>('/api/ateliar'),
    refetchInterval: (query) => {
      const data = query.state.data as CandidateDesk | EmployerDesk | undefined
      return data && 'running' in data && data.running ? 15_000 : false
    },
  })
  if (profile.role === 'employer') {
    return <EmployerTracker sessions={q.data && 'sessions' in q.data ? q.data.sessions : []} />
  }
  const desk = q.data && 'roles' in q.data ? q.data : null
  return (
    <CandidateTracker
      roles={desk?.roles ?? []}
      sessions={desk?.sessions ?? []}
      running={desk?.running ?? null}
    />
  )
}

function CandidateTracker({
  roles,
  sessions,
  running,
}: {
  roles: HiredRole[]
  sessions: TrackerSession[]
  running: TrackerSession | null
}) {
  const qc = useQueryClient()
  const [roleId, setRoleId] = useState(roles[0]?.applicationId ?? '')
  const [now, setNow] = useState(Date.now())
  const [onWay, setOnWay] = useState(() => sessionStorage.getItem(WAY_KEY) === '1')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!roleId && roles[0]) setRoleId(roles[0].applicationId)
  }, [roleId, roles])

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const role = roles.find((r) => r.applicationId === roleId) ?? roles[0]
  const dayStart = startOfLocalDay(now)
  const weekStart = startOfLocalWeek(now)
  const today = secondsInRange(sessions, dayStart, dayStart + 86_400_000, now)
  const week = secondsInRange(sessions, weekStart, weekStart + 7 * 86_400_000, now)
  const status = running ? 'Tracking' : onWay ? 'On the way' : 'Idle'
  const statusHint = running
    ? formatHoursMinutes(sessionSeconds(running, now)) + ' this shift'
    : onWay
      ? 'Clock in when you start'
      : 'Start a shift to track'

  const start = useMutation({
    mutationFn: async () => {
      const location = await optionalLocation()
      return api('/api/ateliar/start', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: roleId,
          note: location ? `Clock in · ${location}` : 'Clock in',
        }),
      })
    },
    onSuccess: () => {
      sessionStorage.removeItem(WAY_KEY)
      setOnWay(false)
      void qc.invalidateQueries({ queryKey: ['ateliar'] })
      setNotice('')
    },
    onError: (err) => setNotice(err instanceof Error ? err.message : 'Could not start tracking.'),
  })
  const stop = useMutation({
    mutationFn: () => api('/api/ateliar/stop', { method: 'POST', body: JSON.stringify({ sessionId: running?.id }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ateliar'] })
      setNotice('')
    },
    onError: (err) => setNotice(err instanceof Error ? err.message : 'Could not clock out.'),
  })

  const sheet = useMemo(
    () => [...sessions].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt)),
    [sessions],
  )

  return (
    <div className="space-y-6">
      <TrackerHeader
        title="Atelier time tracker"
        subtitle="Clock in, track live hours, and review your timesheet. Download it for your desk if you want it offline."
        onDownload={() => void downloadTrackerApp()}
        extra={
          <Button variant="paper" onClick={() => downloadText('Atelier-timesheet.csv', sessionsToCsv(sessions))}>
            <Download className="size-4" />
            Download timesheet
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard kicker="Today" value={formatHoursMinutes(today)} hint="Completed shifts" />
        <StatCard kicker="This week" value={formatHoursMinutes(week)} hint="Mon – Sun total" />
        <StatCard kicker="Status" value={status} hint={statusHint} />
      </div>

      {role ? (
        <section className="rounded-3xl border border-dashed border-[#1f3d32]/25 bg-[#f7faf8] p-6 sm:p-7">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {running ? 'Tracking now' : onWay ? 'On the way' : 'Ready to track'}
          </p>
          {roles.length > 1 && !running ? (
            <select
              className="mt-3 h-10 max-w-lg rounded-full border border-input bg-white px-4 text-sm"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.applicationId} value={r.applicationId}>
                  {r.jobTitle} · {r.company}
                </option>
              ))}
            </select>
          ) : (
            <h2 className="mt-2 text-2xl sm:text-3xl">{running?.jobTitle ?? role.jobTitle}</h2>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {running?.company ?? role.company} · {formatSheetDate(running?.startedAt ?? new Date(now).toISOString())}
            {running ? ` · ${formatHoursMinutes(sessionSeconds(running, now))}` : ''}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {running ? (
              <Button className="rounded-full" variant="copper" disabled={stop.isPending} onClick={() => stop.mutate()}>
                {stop.isPending ? 'Saving…' : 'Clock out'}
              </Button>
            ) : (
              <>
                <Button
                  className="rounded-full"
                  variant={onWay ? 'default' : 'outline'}
                  onClick={() => void markOnWay(setOnWay, setNotice)}
                >
                  On my way
                </Button>
                <Button className="rounded-full" variant="default" disabled={start.isPending} onClick={() => start.mutate()}>
                  {start.isPending ? 'Starting…' : 'Start tracking'}
                </Button>
              </>
            )}
          </div>
          {notice ? <p className="mt-3 text-sm text-muted-foreground">{notice}</p> : null}
        </section>
      ) : (
        <Card className="rounded-3xl">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Atelier time tracker opens after an Atelier employer marks you hired. You start it. You stop it. Outside
            boards stay on their own sites.
          </p>
        </Card>
      )}

      <Timesheet sessions={sheet} now={now} />
    </div>
  )
}

function EmployerTracker({ sessions }: { sessions: TrackerSession[] }) {
  const now = Date.now()
  const dayStart = startOfLocalDay(now)
  const weekStart = startOfLocalWeek(now)
  const today = secondsInRange(sessions, dayStart, dayStart + 86_400_000, now)
  const week = secondsInRange(sessions, weekStart, weekStart + 7 * 86_400_000, now)
  const live = sessions.some((s) => !s.endedAt)

  return (
    <div className="space-y-6">
      <TrackerHeader
        title="Atelier time tracker"
        subtitle="Hours hired candidates logged after you marked them hired. They start and stop the clock themselves."
        onDownload={() => void downloadTrackerApp()}
        extra={
          <>
            <Button variant="paper" onClick={() => downloadText('Atelier-team.csv', sessionsToCsv(sessions))}>
              <Download className="size-4" />
              Download timesheet
            </Button>
            <Button variant="paper" asChild>
              <Link to="/employer/inbox">Mark someone hired</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard kicker="Today" value={formatHoursMinutes(today)} hint="Team hours" />
        <StatCard kicker="This week" value={formatHoursMinutes(week)} hint="Mon – Sun total" />
        <StatCard kicker="Status" value={live ? 'Live' : 'Idle'} hint={live ? 'Someone is tracking' : 'No open shift'} />
      </div>
      <Timesheet sessions={sessions} now={now} />
    </div>
  )
}

function TrackerHeader({
  title,
  subtitle,
  onDownload,
  extra,
}: {
  title: string
  subtitle: string
  onDownload: () => void
  extra?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#c9c0ae22] bg-[var(--forest)] text-[var(--paper)] shadow-[0_16px_40px_rgba(13,27,22,0.12)]">
      <div className="flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
        <div className="max-w-xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Time</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#d8d0c0] sm:text-base">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="paper" onClick={onDownload}>
            <Download className="size-4" />
            Download tracker
          </Button>
          {extra}
        </div>
      </div>
    </section>
  )
}

function StatCard({ kicker, value, hint }: { kicker: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-border bg-white px-5 py-5 shadow-[0_8px_24px_rgba(19,38,31,0.04)]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{kicker}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

function Timesheet({ sessions, now }: { sessions: TrackerSession[]; now: number }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-[0_8px_24px_rgba(19,38,31,0.04)]">
      <div className="px-5 py-5 sm:px-6">
        <h2 className="text-xl">Timesheet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Completed tracked sessions</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm md:min-w-[32rem]">
          <thead className="border-y border-border text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold sm:px-6">Date</th>
              <th className="px-5 py-3 font-semibold sm:px-6">Shift</th>
              <th className="hidden px-5 py-3 font-semibold sm:px-6 md:table-cell">Clock in</th>
              <th className="hidden px-5 py-3 font-semibold sm:px-6 md:table-cell">Clock out</th>
              <th className="px-5 py-3 font-semibold sm:px-6">Duration</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length ? (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 sm:px-6">{formatSheetDate(s.startedAt)}</td>
                  <td className="px-5 py-4 sm:px-6">
                    <p className="font-medium">{s.company}</p>
                    <p className="text-muted-foreground">{s.jobTitle}</p>
                  </td>
                  <td className="hidden px-5 py-4 tabular-nums sm:px-6 md:table-cell">{formatClock(s.startedAt)}</td>
                  <td className="hidden px-5 py-4 tabular-nums sm:px-6 md:table-cell">{s.endedAt ? formatClock(s.endedAt) : 'Live'}</td>
                  <td className="px-5 py-4 tabular-nums sm:px-6">{formatHoursMinutes(sessionSeconds(s, now))}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-muted-foreground sm:px-6">
                  No tracked sessions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

async function markOnWay(setOnWay: (v: boolean) => void, setNotice: (v: string) => void) {
  sessionStorage.setItem(WAY_KEY, '1')
  setOnWay(true)
  const location = await optionalLocation()
  setNotice(location ? 'On the way. Location saved for this clock-in.' : 'On the way. Start tracking when you begin.')
}

function optionalLocation(): Promise<string | undefined> {
  if (!navigator.geolocation) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
      () => resolve(undefined),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 6000 },
    )
  })
}

function downloadHref(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

function downloadText(filename: string, body: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([body], { type })
  const url = URL.createObjectURL(blob)
  downloadHref(url, filename)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function downloadTrackerApp() {
  const res = await fetch('/ateliar/Atelier-time-tracker.html')
  const html = await res.text()
  downloadText('Atelier-time-tracker.html', html, 'text/html;charset=utf-8')
}
