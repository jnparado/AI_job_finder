import type { Job } from '@shared/types'

export type JobManageAction = 'close' | 'reopen' | 'delete'

export function isJobClosed(job: Job) {
  return job.listingStatus === 'closed'
}
