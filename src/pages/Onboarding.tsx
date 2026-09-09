import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { CandidateWorkshop } from '@/pages/CandidateWorkshop'

export function OnboardingPage() {
  const { profile } = useAuth()
  if (profile.role === 'employer') return <Navigate to="/employer" replace />
  return <CandidateWorkshop />
}
