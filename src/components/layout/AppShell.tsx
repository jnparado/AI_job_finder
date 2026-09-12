import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Bookmark,
  Briefcase,
  Calendar,
  ChevronDown,
  CircleHelp,
  Crown,
  Home,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  ScrollText,
  Search,
  Settings,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { prefetchRoute } from '@/lib/prefetch'
import { isDrillPath } from '@/lib/nav'
import { BrandMark } from '@/components/ui/feedback'
import { localBrandPath } from '@/lib/brandAssets'
import { displayName, isStaffRole } from '@shared/types'
import { cn, initials } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const LINKS: { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: 'messages' }[] = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/jobs', label: 'Matches', icon: Search },
  { to: '/app/applications', label: 'My Jobs', icon: Briefcase },
  { to: '/app/messages', label: 'Messages', icon: MessagesSquare, badge: 'messages' },
  { to: '/app/resume', label: 'Resume', icon: ScrollText },
  { to: '/app/profile', label: 'Skills & Assessments', icon: User },
  { to: '/app/ateliar', label: 'Calendar', icon: Calendar },
  { to: '/app/career', label: 'Career Coach', icon: LineChart },
  { to: '/app/interview', label: 'Interview Prep', icon: MessageSquare },
  { to: '/app/jobs', label: 'Saved Jobs', icon: Bookmark },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

const ACCOUNT_LINKS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/interview', label: 'Interview', icon: MessageSquare },
  { to: '/app/finances', label: 'Finances', icon: Wallet },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

interface Note {
  title: string
  body?: string
  href?: string
}

interface ThreadRow {
  unreadCount?: number
}

export function AppShell() {
  const { profile, signOut, destinationFor } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hiringDesk = profile.role === 'employer' || isStaffRole(profile.role)
  const name = displayName(profile)
  const [open, setOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [query, setQuery] = useState('')
  const toolsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const messenger = location.pathname.startsWith('/app/messages')

  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Note[]>('/api/notifications'),
    staleTime: 120_000,
    enabled: !hiringDesk,
  })
  const threads = useQuery({
    queryKey: ['messages'],
    queryFn: () => api<ThreadRow[]>('/api/messages'),
    staleTime: 30_000,
    enabled: !hiringDesk,
  })
  const noteCount = notes.data?.length ?? 0
  const unread = (threads.data ?? []).reduce((n, t) => n + (t.unreadCount ?? 0), 0)

  function closeMenus() {
    setBellOpen(false)
    setHelpOpen(false)
    setAccountOpen(false)
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/app/jobs?q=${encodeURIComponent(q)}` : '/app/jobs')
    setOpen(false)
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!toolsRef.current?.contains(e.target as Node)) closeMenus()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenus()
      const tag = (e.target as HTMLElement | null)?.tagName
      if ((e.key === 'k' || e.key === 'K' || e.key === '/') && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  if (hiringDesk) return <Navigate to={destinationFor(profile)} replace />

  function sidebar() {
    return (
      <>
        <Link to="/app" replace onClick={() => setOpen(false)} className="shrink-0" aria-label="Atelier home">
          <BrandMark light compact />
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
          {LINKS.map((l, i) => (
            <NavLink
              key={`${l.label}-${i}`}
              to={l.to}
              end={l.end}
              replace={!isDrillPath(l.to)}
              onMouseEnter={() => prefetchRoute(l.to)}
              onFocus={() => prefetchRoute(l.to)}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-2.5 rounded-xl py-2.5 pl-3.5 pr-3 text-sm transition-colors',
                  isActive
                    ? 'bg-[#0d3a2e] font-medium text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[#5ecf8c]'
                    : 'text-[#c5d0cb] hover:bg-white/5 hover:text-white',
                )
              }
            >
              <l.icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate">{l.label}</span>
              {l.badge === 'messages' && unread ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-[#e23d3d] px-1.5 text-[0.65rem] font-semibold leading-5 text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-2xl bg-gradient-to-br from-[#0a3328] to-[#001510] p-4 ring-1 ring-[#c6a15b40]">
          <div className="flex items-center gap-2 text-[#c6a15b]">
            <Crown className="size-4" />
            <p className="text-sm font-medium text-white">Upgrade to Pro</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#a8b8b1]">
            Stronger AI matching and coach notes from your real scores.
          </p>
          <Link
            to="/app/resume"
            replace
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl bg-white text-sm font-medium !text-black hover:bg-[#f4f0e8]"
          >
            Upgrade Now →
          </Link>
        </div>

        <div className="relative mt-1 overflow-hidden rounded-2xl">
          <img src={localBrandPath('candidate-window.jpg')} alt="" className="h-24 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002018] via-[#002018]/60 to-transparent" />
          <p className="absolute inset-x-3 bottom-3 font-serif text-sm italic leading-snug text-white">
            A brighter career starts here.
          </p>
        </div>
      </>
    )
  }

  return (
    <div
      className={cn(
        'atelier-app bg-[#f1f3f2] lg:flex',
        messenger ? 'h-svh overflow-hidden' : 'min-h-svh',
      )}
    >
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[min(18.5rem,88vw)] flex-col gap-5 overflow-y-auto bg-[#002018] p-5 text-[#e8eeeb]">
            <button type="button" className="absolute right-4 top-4" aria-label="Close" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
            {sidebar()}
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 z-20 hidden h-svh w-[16.25rem] shrink-0 flex-col gap-5 overflow-y-auto bg-[#002018] px-4 py-5 text-[#e8eeeb] lg:flex">
        {sidebar()}
      </aside>

      <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', messenger && 'h-full min-h-0 lg:h-svh')}>
        <header className="sticky top-0 z-30 flex min-w-0 shrink-0 items-center gap-2 border-b border-[#e7ebe9] bg-white px-3 py-3 sm:gap-3 sm:px-6">
          <button type="button" className="grid size-10 place-items-center lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5 text-[#002018]" />
          </button>
          <form onSubmit={onSearch} className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a9390]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs, companies, or keywords…"
              className="h-11 w-full rounded-full border border-[#e7ebe9] bg-[#f3f5f4] pl-10 pr-12 text-sm outline-none placeholder:text-[#8a9390] focus:border-[#2f9a6f] focus:bg-white"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#dde3e0] bg-white px-1.5 text-[0.65rem] font-medium text-[#8a9390] sm:inline">
              K
            </kbd>
          </form>
          <div ref={toolsRef} className="relative flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid size-10 place-items-center rounded-full text-[#002018] hover:bg-[#eef3f0]"
              onClick={() => {
                setHelpOpen(false)
                setAccountOpen(false)
                setBellOpen((v) => !v)
              }}
            >
              <Bell className="size-5 stroke-[1.5]" />
              {noteCount ? (
                <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-[#e23d3d] px-1 text-[0.6rem] font-semibold leading-4 text-white">
                  {noteCount > 9 ? '9+' : noteCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-label="Help"
              className="hidden size-10 place-items-center rounded-full text-[#002018] hover:bg-[#eef3f0] sm:grid"
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
              aria-label="Account menu"
              className="flex max-w-[14rem] items-center gap-2 rounded-full py-1 pl-1 pr-2 text-left hover:bg-[#eef3f0] sm:pr-3"
              onClick={() => {
                setBellOpen(false)
                setHelpOpen(false)
                setAccountOpen((v) => !v)
              }}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#002018] font-serif text-sm text-white">
                  {initials(name)}
                </span>
              )}
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-medium leading-tight text-[#111827]">{name}</span>
                <span className="block text-xs text-[#6b7280]">Candidate</span>
              </span>
              <ChevronDown className="hidden size-4 text-[#6b7280] sm:block" />
            </button>

            {bellOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-white text-[var(--forest)] shadow-xl">
                <p className="border-b border-border px-4 py-3 text-sm font-medium">Waiting for you</p>
                {notes.data?.length ? (
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {notes.data.slice(0, 8).map((n, i) => (
                      <li key={`${n.title}-${i}`}>
                        <Link to={n.href || '/app'} className="block px-4 py-2.5 hover:bg-muted" onClick={closeMenus}>
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
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-white p-4 text-[var(--forest)] shadow-xl">
                <p className="text-sm font-medium">Candidate help</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Packets leave only after you approve. We never auto-apply on LinkedIn, Indeed, or Upwork.
                </p>
              </div>
            ) : null}

            {accountOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-56 overflow-hidden rounded-2xl border border-border bg-white text-[var(--forest)] shadow-xl">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">Candidate</p>
                </div>
                <div className="p-2">
                  {ACCOUNT_LINKS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        closeMenus()
                        navigate(item.to, { replace: true })
                      }}
                    >
                      <item.icon className="size-4 opacity-70" />
                      {item.label}
                    </button>
                  ))}
                </div>
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
        </header>

        <main
          className={cn(
            'min-w-0 flex-1',
            messenger
              ? 'flex min-h-0 flex-col [&>*]:h-full [&>*]:min-h-0'
              : 'px-4 py-5 sm:px-6 sm:py-6',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
