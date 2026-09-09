import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Timer } from 'lucide-react'
import { formatDuration, sessionsToCsv, sessionSeconds, type TrackerSession } from '@shared/tracker'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/feedback'

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

export function AteliarPage() {
  const { profile } = useAuth()
  const q = useQuery({
    queryKey: ['ateliar'],
    queryFn: () => api<CandidateDesk | EmployerDesk>('/api/ateliar'),
    refetchInterval: 15_000,
  })
  if (profile.role === 'employer') {
    return <EmployerAteliar sessions={q.data && 'sessions' in q.data ? q.data.sessions : []} />
  }
  const desk = q.data && 'roles' in q.data ? q.data : null
  return (
    <CandidateAteliar
      roles={desk?.roles ?? []}
      sessions={desk?.sessions ?? []}
      running={desk?.running ?? null}
    />
  )
}

function CandidateAteliar({
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
  const [note, setNote] = useState(running?.note ?? '')
  const [now, setNow] = useState(Date.now())
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!roleId && roles[0]) setRoleId(roles[0].applicationId)
  }, [roleId, roles])

  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [running])

  const start = useMutation({
    mutationFn: () =>
      api('/api/ateliar/start', { method: 'POST', body: JSON.stringify({ applicationId: roleId, note }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ateliar'] })
      setNotice('Ateliar is running.')
    },
    onError: (err) => setNotice(err instanceof Error ? err.message : 'Could not start Ateliar.'),
  })
  const stop = useMutation({
    mutationFn: () =>
      api('/api/ateliar/stop', { method: 'POST', body: JSON.stringify({ sessionId: running?.id, note }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ateliar'] })
      setNotice('Session saved.')
    },
    onError: (err) => setNotice(err instanceof Error ? err.message : 'Could not stop Ateliar.'),
  })

  const liveSeconds = running ? sessionSeconds(running, now) : 0
  const totalSeconds = useMemo(
    () => sessions.reduce((n, s) => n + sessionSeconds(s, now), 0),
    [sessions, now],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Ateliar"
        title="Official work tracker"
        description="Ateliar is Atelier’s tracker for hired candidates. You start it. You stop it. The employer sees hours on the role they hired — not a hidden monitor, and not another company’s product."
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void downloadAteliarApp()}>
          <Download className="size-4" />
          Download Ateliar
        </Button>
        <Button variant="outline" onClick={() => downloadText('Ateliar-timesheet.csv', sessionsToCsv(sessions))}>
          <Download className="size-4" />
          Download timesheet
        </Button>
      </div>

      {roles.length ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="size-5 text-[var(--copper)]" />
            <h2>Desk clock</h2>
          </div>
          <p className="font-serif text-5xl tabular-nums">{formatDuration(running ? liveSeconds : 0)}</p>
          <p className="text-sm text-muted-foreground">
            {running
              ? `Running for ${running.company} · ${running.jobTitle}`
              : `${formatDuration(totalSeconds)} logged on hired Atelier roles.`}
          </p>
          <label className="block max-w-lg space-y-1 text-sm">
            Hired role
            <select
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={roleId}
              disabled={Boolean(running)}
              onChange={(e) => setRoleId(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.applicationId} value={r.applicationId}>
                  {r.company} — {r.jobTitle}
                </option>
              ))}
            </select>
          </label>
          <label className="block max-w-lg space-y-1 text-sm">
            What you are working on
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
          </label>
          {running ? (
            <Button variant="copper" disabled={stop.isPending} onClick={() => stop.mutate()}>
              {stop.isPending ? 'Saving…' : 'Stop Ateliar'}
            </Button>
          ) : (
            <Button variant="copper" disabled={start.isPending} onClick={() => start.mutate()}>
              {start.isPending ? 'Starting…' : 'Start Ateliar'}
            </Button>
          )}
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        </Card>
      ) : (
        <Card>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ateliar unlocks when an Atelier employer marks you hired. Outside boards stay on their own sites — we do
            not track work there.
          </p>
        </Card>
      )}

      <Card className="space-y-3">
        <h2>Sessions</h2>
        {sessions.length ? (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">
                    {s.company} · {s.jobTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(s.startedAt).toLocaleString()}
                    {s.note ? ` · ${s.note}` : ''}
                    {s.endedAt ? '' : ' · running'}
                  </p>
                </div>
                <p className="font-serif text-xl tabular-nums">{formatDuration(sessionSeconds(s, now))}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No Ateliar sessions yet.</p>
        )}
      </Card>
    </div>
  )
}

function EmployerAteliar({ sessions }: { sessions: TrackerSession[] }) {
  const total = sessions.reduce((n, s) => n + sessionSeconds(s), 0)
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Ateliar"
        title="Hired hours"
        description="Hours candidates logged in Ateliar after you marked them hired on Atelier."
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void downloadAteliarApp()}>
          <Download className="size-4" />
          Download Ateliar
        </Button>
        <Button variant="outline" onClick={() => downloadText('Ateliar-team.csv', sessionsToCsv(sessions))}>
          <Download className="size-4" />
          Download team timesheet
        </Button>
        <Button variant="outline" asChild>
          <Link to="/employer/inbox">Mark someone hired</Link>
        </Button>
      </div>
      <Card>
        <p className="text-sm text-muted-foreground">Total logged</p>
        <p className="mt-1 font-serif text-4xl tabular-nums">{formatDuration(total)}</p>
      </Card>
      <Card className="space-y-3">
        <h2>Sessions</h2>
        {sessions.length ? (
          sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{s.jobTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(s.startedAt).toLocaleString()}
                  {s.note ? ` · ${s.note}` : ''}
                </p>
              </div>
              <p className="font-serif text-xl tabular-nums">{formatDuration(sessionSeconds(s))}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No hired candidate has started Ateliar yet.</p>
        )}
      </Card>
    </div>
  )
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

async function downloadAteliarApp() {
  const res = await fetch('/ateliar/Ateliar.html')
  const html = await res.text()
  downloadText('Ateliar.html', html, 'text/html;charset=utf-8')
}
