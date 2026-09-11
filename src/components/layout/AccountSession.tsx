import { Link } from 'react-router-dom'
import { displayName, isStaffRole } from '@shared/types'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { prefetchRoute } from '@/lib/prefetch'
import { initials } from '@/lib/utils'

export function useAccountSession() {
  const { loading, user, demo, profile, destinationFor } = useAuth()
  const signedIn = Boolean(user || demo)
  const home = destinationFor(profile)
  const name = displayName(profile)
  const openLabel = isStaffRole(profile.role)
    ? 'Open staff'
    : profile.role === 'employer'
      ? 'Open hiring'
      : 'Open studio'
  return { loading, signedIn, profile, home, name, openLabel }
}

export function MarketingSessionButtons({ hiring }: { hiring?: boolean }) {
  const { loading, signedIn, home, name, openLabel } = useAccountSession()
  const loginTo = hiring ? '/login?role=employer' : '/login'
  const registerTo = hiring ? '/register?role=employer' : '/register'

  if (loading) {
    return <div className="h-10 w-36 animate-pulse rounded-full bg-[#1f3d32]" aria-hidden />
  }

  if (signedIn) {
    return (
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-[#1f3d32] font-serif text-sm text-[var(--paper)]">
          {initials(name)}
        </span>
        <span className="hidden max-w-[8.5rem] truncate text-sm text-[#d8d0c0] sm:inline">{name}</span>
        <Button variant="paper" className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm" asChild>
          <Link to={home} onMouseEnter={() => prefetchRoute(home)}>
            {openLabel}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 gap-1.5 sm:gap-2">
      <Button
        variant="outline"
        className="h-9 border-[#c9c0ae55] px-3 text-xs text-[var(--paper)] hover:bg-[#1f3d32] sm:h-10 sm:px-4 sm:text-sm"
        asChild
      >
        <Link to={loginTo} onMouseEnter={() => prefetchRoute('/login')}>
          Log in
        </Link>
      </Button>
      <Button variant={hiring ? 'paper' : 'copper'} className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm" asChild>
        <Link to={registerTo} onMouseEnter={() => prefetchRoute('/register')}>
          Sign up
        </Link>
      </Button>
    </div>
  )
}

export function SessionHomeCtas({
  audience,
  guestPrimary,
  guestSecondary,
}: {
  audience?: 'candidate' | 'employer'
  guestPrimary: { to: string; label: string; variant?: 'copper' | 'paper' }
  guestSecondary?: { to: string; label: string }
}) {
  const { loading, signedIn, home, openLabel } = useAccountSession()
  const primaryVariant = audience === 'employer' ? 'paper' : 'copper'

  if (loading) {
    return <div className="h-12 w-40 animate-pulse rounded-full bg-[#1f3d32]" aria-hidden />
  }

  if (signedIn) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button
          variant={primaryVariant}
          size="lg"
          className="h-12 px-7 text-[0.8rem] font-semibold uppercase tracking-[0.1em]"
          asChild
        >
          <Link to={home}>{openLabel}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant={guestPrimary.variant ?? primaryVariant}
        size="lg"
        className="h-12 px-7 text-[0.8rem] font-semibold uppercase tracking-[0.1em]"
        asChild
      >
        <Link to={guestPrimary.to}>{guestPrimary.label}</Link>
      </Button>
      {guestSecondary ? (
        <Button
          variant="outline"
          size="lg"
          className="h-12 border-[#c9c0ae66] px-7 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper)] hover:bg-[#1f3d32]"
          asChild
        >
          <Link to={guestSecondary.to}>{guestSecondary.label}</Link>
        </Button>
      ) : null}
    </div>
  )
}
