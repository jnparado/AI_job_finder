import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { JobManageAction } from '@/components/employer/jobListing'

export function useEmployerJobActions() {
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState<{
    id: string
    title: string
    action: JobManageAction
    applicants: number
  } | null>(null)
  const [error, setError] = useState('')

  const patchJob = useMutation({
    mutationFn: ({ id, listingStatus }: { id: string; listingStatus: 'active' | 'closed' }) =>
      api(`/api/employer/jobs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ listingStatus }),
      }),
    onSuccess: async () => {
      setError('')
      setConfirm(null)
      await qc.invalidateQueries({ queryKey: ['employer-jobs'] })
      await qc.invalidateQueries({ queryKey: ['employer-job'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not update the listing.'),
  })

  const deleteJob = useMutation({
    mutationFn: (id: string) => api(`/api/employer/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setError('')
      setConfirm(null)
      await qc.invalidateQueries({ queryKey: ['employer-jobs'] })
      await qc.invalidateQueries({ queryKey: ['employer-job'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not delete the job.'),
  })

  function ask(id: string, title: string, action: JobManageAction, applicants: number) {
    setError('')
    setConfirm({ id, title, action, applicants })
  }

  function cancelConfirm() {
    if (patchJob.isPending || deleteJob.isPending) return
    setConfirm(null)
    setError('')
  }

  function runConfirm() {
    if (!confirm) return
    if (confirm.action === 'delete') {
      if (confirm.applicants) {
        patchJob.mutate({ id: confirm.id, listingStatus: 'closed' })
        return
      }
      deleteJob.mutate(confirm.id)
      return
    }
    patchJob.mutate({
      id: confirm.id,
      listingStatus: confirm.action === 'close' ? 'closed' : 'active',
    })
  }

  const busy = patchJob.isPending || deleteJob.isPending

  return { confirm, error, busy, ask, cancelConfirm, runConfirm }
}
