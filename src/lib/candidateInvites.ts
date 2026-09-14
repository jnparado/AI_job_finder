import type { MatchCategory } from '@shared/types'

export interface CandidateInvite {
  id: string
  jobId: string
  jobTitle: string
  company: string
  employerId: string
  createdAt: string
  matchScore?: number
  matchCategory?: MatchCategory
  location?: string
  salaryMin?: number
  salaryMax?: number
  currency?: string
  applicationId?: string
  applicationStatus?: string
}

export function invitePending(row: CandidateInvite) {
  return !row.applicationId || row.applicationStatus === 'draft'
}

export function pendingInviteCount(rows: CandidateInvite[]) {
  return rows.filter(invitePending).length
}
