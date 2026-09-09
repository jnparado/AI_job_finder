import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

/** Old path from before signup lived on /register. Anyone with an account goes to their home. */
export function OnboardingPage() {
  const { destinationFor, profile } = useAuth()
  return <Navigate to={destinationFor(profile)} replace />
}
