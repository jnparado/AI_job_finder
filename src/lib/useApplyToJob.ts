import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useApplyToJob() {
  const navigate = useNavigate()
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (jobId: string) =>
      api<{ id: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      }),
    onSuccess: (row) => navigate(`/app/applications/${row.id}`),
    onSettled: () => setApplyingId(null),
  })

  return {
    applyingId,
    applying: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : '',
    applyToJob(jobId: string) {
      setApplyingId(jobId)
      mutation.mutate(jobId)
    },
  }
}
