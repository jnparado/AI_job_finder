import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Job } from '@shared/types'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface InviteCandidate {
  id: string
  name: string
  matchJobTitle?: string
}

export interface TalentInviteRow {
  id: string
  candidateId: string
  jobId: string
  jobTitle: string
  createdAt: string
}

interface TalentDeskCache {
  people: unknown[]
  invites: TalentInviteRow[]
}

function pickDefaultJob(person: InviteCandidate, jobs: Job[], invites: TalentInviteRow[]) {
  const invited = (jobId: string) => invites.some((row) => row.candidateId === person.id && row.jobId === jobId)

  if (person.matchJobTitle) {
    const matched = jobs.find(
      (job) =>
        !invited(job.id) &&
        job.title.trim().toLowerCase() === person.matchJobTitle!.trim().toLowerCase(),
    )
    if (matched) return matched.id
  }

  const uninvited = jobs.find((job) => !invited(job.id))
  return uninvited?.id ?? jobs[0]?.id ?? ''
}

function isInvited(personId: string, jobId: string, invites: TalentInviteRow[]) {
  return invites.some((row) => row.candidateId === personId && row.jobId === jobId)
}

export function InviteToJobDialog({
  person,
  jobs,
  invites,
  jobsLoading,
  onClose,
}: {
  person: InviteCandidate | null
  jobs: Job[]
  invites: TalentInviteRow[]
  jobsLoading?: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [jobId, setJobId] = useState('')
  const [note, setNote] = useState('')

  const open = Boolean(person)

  useEffect(() => {
    if (!person || !jobs.length) {
      setJobId('')
      setNote('')
      return
    }
    setJobId(pickDefaultJob(person, jobs, invites))
    setNote('')
  }, [person?.id, person?.matchJobTitle, jobs, invites])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const alreadyInvited = useMemo(
    () => Boolean(person && jobId && isInvited(person.id, jobId, invites)),
    [person, jobId, invites],
  )

  const selectedJob = jobs.find((job) => job.id === jobId)

  const send = useMutation({
    mutationFn: ({ candidateId, selectedJobId }: { candidateId: string; selectedJobId: string }) =>
      api<{ invite: TalentInviteRow; already?: boolean }>(
        `/api/employer/candidates/${encodeURIComponent(candidateId)}/invite`,
        {
          method: 'POST',
          body: JSON.stringify({ jobId: selectedJobId }),
        },
      ),
    onSuccess: async (res, vars) => {
      qc.setQueryData<TalentDeskCache>(['employer-candidates'], (cur) => {
        if (!cur) return cur
        const exists = cur.invites.some((row) => row.id === res.invite.id)
        const nextInvites = exists
          ? cur.invites
          : [res.invite, ...cur.invites.filter((row) => !(row.candidateId === vars.candidateId && row.jobId === vars.selectedJobId))]
        return { ...cur, invites: nextInvites }
      })
      await qc.invalidateQueries({ queryKey: ['employer-candidates'] })

      if (res.already) {
        setNote('Already invited to this role.')
        return
      }

      setNote('Invite sent. They can review the job and apply if they want.')
      window.setTimeout(() => onClose(), 1400)
    },
    onError: (err) => {
      setNote(err instanceof Error ? err.message : 'Could not send the invite.')
    },
  })

  if (!person) return null

  function handleClose() {
    if (send.isPending) return
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-[#13261f]/45 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#e4ebe6] bg-white p-5 shadow-[0_20px_50px_rgba(19,38,31,0.18)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-to-job-title"
      >
        <h2 id="invite-to-job-title" className="font-serif text-2xl text-[var(--forest)]">
          Invite to Job
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-[var(--forest)]">{person.name}</span> will get a notice to review the
          role. Nothing is sent as an application until they approve.
        </p>

        {jobsLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading your open jobs…</p>
        ) : jobs.length ? (
          <label className="mt-4 block space-y-1.5">
            <span className="text-sm font-medium text-[var(--forest)]">Job</span>
            <select
              className="h-10 w-full rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm text-[var(--forest)]"
              value={jobId}
              disabled={send.isPending}
              onChange={(e) => {
                setJobId(e.target.value)
                setNote('')
              }}
            >
              {jobs.map((job) => {
                const invited = isInvited(person.id, job.id, invites)
                return (
                  <option key={job.id} value={job.id}>
                    {job.title}
                    {invited ? ' (invited)' : ''}
                  </option>
                )
              })}
            </select>
            {selectedJob && person.matchJobTitle === selectedJob.title ? (
              <p className="text-xs text-muted-foreground">Best AI match for this candidate.</p>
            ) : null}
          </label>
        ) : (
          <p className="mt-4 text-sm text-[#8f4326]">Post an open job first, then invite people to it.</p>
        )}

        {alreadyInvited || note ? (
          <p
            className={cn(
              'mt-3 text-sm',
              note.includes('Could not') || note.includes('Pick one') ? 'text-[#8f4326]' : 'text-[#147a48]',
            )}
          >
            {alreadyInvited && !note ? 'Already invited to this role.' : note}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-xl" disabled={send.isPending} onClick={handleClose}>
            Close
          </Button>
          {jobs.length ? (
            <Button
              type="button"
              className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]"
              disabled={send.isPending || !jobId || alreadyInvited || jobsLoading}
              onClick={() => send.mutate({ candidateId: person.id, selectedJobId: jobId })}
            >
              {send.isPending ? 'Sending…' : 'Send invite'}
            </Button>
          ) : (
            <Button className="rounded-xl bg-[#147a48] !text-white hover:bg-[#0f5e37]" asChild>
              <Link to="/employer/jobs/new">Post a Job</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
