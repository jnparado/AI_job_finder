import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  CircleHelp,
  FileText,
  Home,
  LineChart,
  LogOut,
  MessageSquare,
  MessagesSquare,
  ScrollText,
  Search,
  Settings,
  Timer,
  User,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { prefetchRoute } from '@/lib/prefetch'
import { isDrillPath } from '@/lib/nav'
import { BrandMark } from '@/components/ui/feedback'
import { displayName, isStaffRole } from '@shared/types'
import { cn, initials } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const PRIMARY: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/jobs', label: 'Matches', icon: Search },
  { to: '/app/applications', label: 'Applications', icon: FileText },
  { to: '/app/messages', label: 'Messages', icon: MessagesSquare },
  { to: '/app/resume', label: 'Resume', icon: ScrollText },
  { to: '/app/career', label: 'Career Coach', icon: LineChart },
  { to: '/app/ateliar', label: 'Tracker', icon: Timer },
]

const ACCOUNT_LINKS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app', label: 'Your studio', icon: Home, end: true },
  { to: '/app/interview', label: 'Interview', icon: MessageSquare },
  { to: '/app/finances', label: 'Finances', icon: Wallet },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

interface Note {
  title: string
  body?: string
  href?: string
}

export function AppShell() {
  const { profile, signOut, destinationFor } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hiringDesk = profile.role === 'employer' || isStaffRole(profile.role)
  const name = displayName(profile)
  const [bellOpen, setBellOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)
  const settingsOn = location.pathname.startsWith('/app/settings')
  const messenger = location.pathname.startsWith('/app/messages')
  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Note[]>('/api/notifications'),
    staleTime: 120_000,
    enabled: !hiringDesk,
  })
  const noteCount = notes.data?.length ?? 0

  function closeMenus() {
    setBellOpen(false)
    setHelpOpen(false)
    setAccountOpen(false)
  }

  function openSettings() {
    closeMenus()
    navigate('/app/settings', { replace: true })
  }

  function goAccount(to: string) {
    closeMenus()
    navigate(to, { replace: true })
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!toolsRef.current?.contains(e.target as Node)) closeMenus()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenus()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  if (hiringDesk) return <Navigate to={destinationFor(profile)} replace />

  return (
    <div className={cn('atelier-app overflow-x-clip', messenger ? 'flex h-svh flex-col overflow-hidden' : 'min-h-svh')}>
      <header className="sticky top-0 z-40 shrink-0 border-b border-[#c9c0ae22] bg-[var(--forest)] text-[var(--paper)]">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5">
          <Link to="/app" replace className="shrink-0" aria-label="Atelier home">
            <BrandMark light compact />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-stretch justify-center gap-0.5 overflow-x-auto [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
            {PRIMARY.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                replace
                onMouseEnter={() => prefetchRoute(item.to)}
                onFocus={() => prefetchRoute(item.to)}
                className={({ isActive }) =>
                  `flex min-w-[4.25rem] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[0.7rem] transition-colors sm:min-w-[4.75rem] ${
                    isActive ? 'text-[var(--paper)]' : 'text-[#c9c0ae] hover:text-[var(--paper)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="size-[1.15rem] stroke-[1.5]" />
                    <span className="leading-none">{item.label}</span>
                    <span className={`mt-0.5 h-0.5 w-7 rounded-full ${isActive ? 'bg-[#c6a15b]' : 'bg-transparent'}`} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div ref={toolsRef} className="relative flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={bellOpen}
              className="relative grid size-10 place-items-center text-white"
              onClick={() => {
                setHelpOpen(false)
                setAccountOpen(false)
                setBellOpen((v) => !v)
              }}
            >
              <Bell className="size-5 stroke-[1.5]" />
              {noteCount ? (
                <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-[var(--copper)] px-1 text-[0.6rem] font-semibold leading-4">
                  {noteCount > 9 ? '9+' : noteCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Help"
              aria-expanded={helpOpen}
              className={`grid size-10 place-items-center ${helpOpen ? 'text-white' : 'text-[#c9c0ae] hover:text-white'}`}
              onClick={() => {
                setBellOpen(false)
                setAccountOpen(false)
                setHelpOpen((v) => !v)
              }}
            >
              <CircleHelp className="size-5 stroke-[1.5]" />
            </button>

            <button
              type="button"
              aria-label="Settings"
              aria-current={settingsOn ? 'page' : undefined}
              className={`grid size-10 place-items-center ${
                settingsOn ? 'text-white' : 'text-[#c9c0ae] hover:text-white'
              }`}
              onClick={openSettings}
            >
              <Settings className="size-5 stroke-[1.5]" />
            </button>

            <button
              type="button"
              aria-label="Account menu"
              aria-expanded={accountOpen}
              className="flex max-w-[12rem] items-center gap-2 rounded-2xl border border-[#c9c0ae44] bg-[#1a332b] px-2 py-1.5 text-left sm:max-w-[14rem] sm:px-2.5"
              onClick={() => {
                setBellOpen(false)
                setHelpOpen(false)
                setAccountOpen((v) => !v)
              }}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#244a3c] font-serif text-sm text-white">
                  {initials(name).slice(0, 1)}
                </span>
              )}
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm leading-tight text-white">{name}</span>
                <span className="mt-0.5 block text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#c6a15b]">
                  Candidate
                </span>
              </span>
            </button>

            {bellOpen ? (
              <div className="absolute right-3 top-[calc(100%-0.25rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-[var(--paper)] text-[var(--forest)] shadow-xl sm:right-5">
                <p className="border-b border-border px-4 py-3 text-sm font-medium">Waiting for you</p>
                {notes.isLoading ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">Loading notices…</p>
                ) : notes.data?.length ? (
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {notes.data.slice(0, 8).map((n, i) => (
                      <li key={`${n.title}-${i}`}>
                        <Link
                          to={n.href || '/app'}
                          replace={!isDrillPath(n.href || '/app')}
                          className="block px-4 py-2.5 hover:bg-muted"
                          onClick={closeMenus}
                        >
                          <p className="text-sm">{n.title}</p>
                          {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground">No new matches waiting.</p>
                )}
              </div>
            ) : null}

            {helpOpen ? (
              <div className="absolute right-3 top-[calc(100%-0.25rem)] z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-[var(--paper)] p-4 text-[var(--forest)] shadow-xl sm:right-5">
                <p className="text-sm font-medium">Candidate help</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Packets leave only after you approve. We never auto-apply on LinkedIn, Indeed, or Upwork.
                </p>
                <div className="mt-3 grid gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={openSettings}
                  >
                    Open settings
                  </button>
                  <Link
                    to="/app/interview"
                    replace
                    className="rounded-lg px-2 py-2 text-sm hover:bg-muted"
                    onClick={closeMenus}
                    onMouseEnter={() => prefetchRoute('/app/interview')}
                  >
                    Interview rehearsal
                  </Link>
                  <Link
                    to="/app/ateliar"
                    replace
                    className="rounded-lg px-2 py-2 text-sm hover:bg-muted"
                    onClick={closeMenus}
                    onMouseEnter={() => prefetchRoute('/app/ateliar')}
                  >
                    Time tracker
                  </Link>
                  <Link
                    to="/app/finances"
                    replace
                    className="rounded-lg px-2 py-2 text-sm hover:bg-muted"
                    onClick={closeMenus}
                    onMouseEnter={() => prefetchRoute('/app/finances')}
                  >
                    Finances
                  </Link>
                </div>
              </div>
            ) : null}

            {accountOpen ? (
              <div className="absolute right-3 top-[calc(100%-0.25rem)] z-50 w-56 overflow-hidden rounded-2xl border border-border bg-[var(--paper)] text-[var(--forest)] shadow-xl sm:right-5">
                <button
                  type="button"
                  className="block w-full border-b border-border px-4 py-3 text-left hover:bg-muted"
                  onClick={() => goAccount('/app/profile')}
                  onMouseEnter={() => prefetchRoute('/app/profile')}
                >
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">
                    Candidate
                  </p>
                </button>
                <div className="p-2">
                  {ACCOUNT_LINKS.map((item) => {
                    const on =
                      item.end
                        ? location.pathname === item.to
                        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                    return (
                      <button
                        key={item.label}
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                          on ? 'bg-[#eef3f0]' : 'hover:bg-muted',
                        )}
                        onMouseEnter={() => prefetchRoute(item.to)}
                        onFocus={() => prefetchRoute(item.to)}
                        onClick={() => goAccount(item.to)}
                      >
                        <item.icon className="size-4 opacity-70" />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mx-3 mb-2 rounded-xl border border-[#c6a15b55] bg-[#f7f1e4] px-3 py-2 text-xs leading-relaxed">
                  Packets leave only after you approve.
                </p>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-sm hover:bg-muted"
                  onClick={() => {
                    closeMenus()
                    void signOut().then(() => navigate('/', { replace: true }))
                  }}
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main
        className={cn(
          'mx-auto min-w-0 w-full',
          messenger
            ? 'flex min-h-0 flex-1 flex-col pb-[calc(4.35rem+env(safe-area-inset-bottom))] md:max-w-none md:pb-0 [&>*]:h-full [&>*]:min-h-0'
            : 'max-w-[1280px] px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 md:pb-8',
        )}
      >
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#c9c0ae22] bg-[var(--forest)] pb-[env(safe-area-inset-bottom)] text-[var(--paper)] md:hidden">
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {PRIMARY.slice(0, 5).map((item) => (
            <NavLink
              key={`m-${item.to}`}
              to={item.to}
              end={item.end}
              replace
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[0.65rem] ${
                  isActive ? 'text-[var(--paper)]' : 'text-[#c9c0ae]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="size-5 stroke-[1.5]" />
                  <span className="truncate leading-none">{item.label}</span>
                  <span className={`h-0.5 w-5 rounded-full ${isActive ? 'bg-[#c6a15b]' : 'bg-transparent'}`} />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

