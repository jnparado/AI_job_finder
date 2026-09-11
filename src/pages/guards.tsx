import { Navigate, Outlet } from 'react-router-dom'
import { LoadingScreen } from '@/components/ui/feedback'
import { useAuth } from '@/lib/auth'
import { isStaffRole } from '@shared/types'

export function RequireSession() {
  const { loading, ready, user, demo } = useAuth()
  if (loading || !ready) return <LoadingScreen label="Restoring your session…" />
  if (!user && !demo) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireOnboarding() {
  const { loading, ready, profile, user, demo, destinationFor } = useAuth()
  if (loading || !ready) return <LoadingScreen label="Loading your workspace…" />
  if (!user && !demo) return <Navigate to="/login" replace />
  const dest = destinationFor(profile)
  if (isStaffRole(profile.role) || profile.role === 'employer' || dest.startsWith('/employer') || dest === '/admin') {
    return <Navigate to={dest} replace />
  }
  return <Outlet />
}

export function RequireEmployer() {
  const { loading, ready, profile, user, demo, destinationFor } = useAuth()
  if (loading || !ready) return <LoadingScreen label="Loading your hiring workspace…" />
  if (!user && !demo) return <Navigate to="/login?role=employer" replace />
  if (profile.role !== 'employer') {
    return <Navigate to={destinationFor(profile)} replace />
  }
  if (!profile.companyName && !profile.onboardingCompleted) {
    return <Navigate to="/employer/setup" replace />
  }
  return <Outlet />
}

export function RequireStaff() {
  const { loading, ready, profile, user, demo, destinationFor } = useAuth()
  if (loading || !ready) return <LoadingScreen label="Loading staff workspace…" />
  if (!user && !demo) return <Navigate to="/login" replace />
  if (!isStaffRole(profile.role)) return <Navigate to={destinationFor(profile)} replace />
  return <Outlet />
}
