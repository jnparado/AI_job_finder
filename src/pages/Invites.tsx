import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Check, MapPin } from 'lucide-react'
import { api } from '@/lib/api'
import { invitePending, type CandidateInvite } from '@/lib/candidateInvites'
import { cn, moneyBand } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/feedback'
import { ScoreBadge } from '@/components/jobs/ScoreBadge'

export function InvitesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const invites = useQuery({
    queryKey: ['candidate-invites'],
    queryFn: () => api<CandidateInvite[]>('/api/candidate/invites'),
    staleTime: 30_000,
  })

  const apply = useMutation({
    mutationFn: (jobId: string) =>
      api<{ id: string; already?: boolean }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ['candidate-invites'] })
      void qc.invalidateQueries({ queryKey: ['candidate-home'] })
      void qc.invalidateQueries({ queryKey: ['applications'] })
      navigate(`/app/applications/${row.id}`)
    },
    onSettled: () => setApplyingId(null),
  })

  const list = invites.data ?? []
  const pending = list.filter(invitePending)

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#2f9a6f]">Invites</p>
        <h1 className="mt-1 font-serif text-2xl text-[#002018] sm:text-3xl">Employer invites</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          When an Atelier employer invites you to a role, it shows up here. Review the job and send a packet only if
          you want to apply — nothing is submitted automatically.
        </p>
      </div>

      {invites.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-[#eef3f0]" />
          ))}
        </div>
      ) : list.length ? (
        <ul className="space-y-3">
          {list.map((row) => {
            const pendingRow = invitePending(row)
            const applied = row.applicationId && row.applicationStatus !== 'draft'
            return (
              <li
                key={row.id}
                className="rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_8px_24px_rgba(0,32,24,0.05)] sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {row.matchScore != null ? (
                    <ScoreBadge score={row.matchScore} category={row.matchCategory ?? 'good'} />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e7f6ef] text-[#2f9a6f]">
                      <Briefcase className="size-6" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#e7f6ef] px-2.5 py-0.5 text-xs font-medium text-[#147a48]">
                        Employer invite
                      </span>
                      {applied ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3f0] px-2.5 py-0.5 text-xs font-medium text-[var(--forest)]">
                          <Check className="size-3.5" />
                          Packet started
                        </span>
                      ) : pendingRow ? (
                        <span className="rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-medium text-[#9a6b1a]">
                          Awaiting your review
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 font-serif text-xl leading-tight text-[#002018]">{row.jobTitle}</h2>
                    <p className="mt-1 text-sm font-medium text-[#374151]">{row.company}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {row.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {row.location}
                        </span>
                      ) : null}
                      {row.salaryMin || row.salaryMax ? (
                        <span>{moneyBand(row.salaryMin, row.salaryMax, row.currency)}</span>
                      ) : null}
                      <span>
                        Invited{' '}
                        {new Date(row.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" className="rounded-xl" asChild>
                        <Link to={`/app/jobs/${row.jobId}`}>View role</Link>
                      </Button>
                      {applied && row.applicationId ? (
                        <Button className="rounded-xl bg-[#002018] hover:bg-[#001510]" asChild>
                          <Link to={`/app/applications/${row.applicationId}`}>Open packet</Link>
                        </Button>
                      ) : (
                        <Button
                          className="rounded-xl bg-[#2f9a6f] hover:bg-[#268a62]"
                          disabled={apply.isPending}
                          onClick={() => {
                            setApplyingId(row.jobId)
                            apply.mutate(row.jobId)
                          }}
                        >
                          {applyingId === row.jobId ? 'Preparing…' : 'Review & apply'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          title="No invites yet"
          body="When an employer on Atelier invites you to a role, it will appear here and in your notifications bell."
          actionLabel="Browse matches"
          to="/app/jobs"
        />
      )}

      {pending.length ? (
        <p className={cn('text-center text-sm text-muted-foreground')}>
          {pending.length} invite{pending.length === 1 ? '' : 's'} waiting for your review.
        </p>
      ) : null}
    </div>
  )
}
