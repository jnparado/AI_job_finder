import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Briefcase,
  Building2,
  ChevronDown,
  CircleHelp,
  Crown,
  FileCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Plus,
  Search,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { prefetchRoute } from '@/lib/prefetch'
import { isDrillPath } from '@/lib/nav'
import { BrandMark } from '@/components/ui/feedback'
import { displayName } from '@shared/types'
import { cn, initials } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const LINKS: { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: 'inbox' | 'messages' }[] = [
  { to: '/employer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employer/jobs/new', label: 'Post a Job', icon: Plus },
  { to: '/employer/inbox', label: 'Find Freelancers', icon: Search },
  { to: '/employer/jobs', label: 'My Jobs', icon: Briefcase, end: true },
  { to: '/employer/inbox', label: 'Applicants', icon: Users, badge: 'inbox' },
  { to: '/employer/messages', label: 'Messages', icon: MessagesSquare, badge: 'messages' },
  { to: '/employer/ateliar', label: 'Contracts', icon: FileCheck },
  { to: '/employer/finances', label: 'Payments', icon: Wallet },
  { to: '/employer/company', label: 'Company Profile', icon: Building2 },
  { to: '/employer/settings', label: 'Settings', icon: Settings },
]

interface Note {
  title: string
  body?: string
  href?: string
}

interface ThreadRow {
  unreadCount?: number
}

export function EmployerShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [query, setQuery] = useState('')
  const toolsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const messenger = location.pathname.startsWith('/employer/messages')
  const person = displayName(profile)
  const company = profile.companyName?.trim() || 'Your company'

  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Note[]>('/api/notifications'),
    staleTime: 120_000,
  })
  const inbox = useQuery({
    queryKey: ['employer-inbox'],
    queryFn: () => api<{ status: string }[]>('/api/employer/applications'),
    staleTime: 30_000,
  })
  const threads = useQuery({
    queryKey: ['messages'],
    queryFn: () => api<ThreadRow[]>('/api/messages'),
    staleTime: 30_000,
  })

  const waiting = (inbox.data ?? []).filter((a) => a.status === 'submitted' || a.status === 'under_review').length
  const unread = (threads.data ?? []).reduce((n, t) => n + (t.unreadCount ?? 0), 0)
  const noteCount = notes.data?.length ?? 0

  function closeMenus() {
    setBellOpen(false)
    setHelpOpen(false)
    setAccountOpen(false)
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/employer/inbox?q=${encodeURIComponent(q)}` : '/employer/inbox')
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

  const sidebar = (
    <>
      <button type="button" className="text-left" onClick={() => navigate('/employer', { replace: true })}>
        <BrandMark light />
      </button>
      <div className="px-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#7dcea0]">Employer portal</p>
        <Link
          to="/employer/company"
          replace
          onClick={() => setOpen(false)}
          className="mt-2 flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-sm text-[#e7e1d4] hover:bg-[#1f3d32]"
        >
          <span className="truncate font-medium">{company}</span>
          <ChevronDown className="size-4 shrink-0 opacity-70" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
        {LINKS.map((l, i) => {
          if (l.label === 'Find Freelancers') {
            return (
              <Link
                key={`${l.label}-${i}`}
                to="/employer/inbox"
                onMouseEnter={() => prefetchRoute('/employer/inbox')}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[#d8d0c0] hover:bg-[#1f3d32]/70"
              >
                <l.icon className="size-4 opacity-80" />
                {l.label}
              </Link>
            )
          }
          return (
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
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-[#147a48] text-white' : 'text-[#d8d0c0] hover:bg-[#1f3d32]/70',
                )
              }
            >
              <l.icon className="size-4 opacity-80" />
              <span className="flex-1">{l.label}</span>
              {l.badge === 'inbox' && waiting ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-[#e23d3d] px-1.5 text-[0.65rem] font-semibold leading-5 text-white">
                  {waiting > 99 ? '99+' : waiting}
                </span>
              ) : null}
              {l.badge === 'messages' && unread ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-[#e23d3d] px-1.5 text-[0.65rem] font-semibold leading-5 text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>
      <Link
        to="/employer/finances"
        replace
        onClick={() => setOpen(false)}
        className="rounded-2xl bg-gradient-to-br from-[#1a3d2e] to-[#0d1b16] p-4 text-[var(--paper)] ring-1 ring-[#c6a15b33]"
      >
        <div className="flex items-center gap-2 text-[#c6a15b]">
          <Crown className="size-4" />
          <span className="text-sm font-medium">Hiring plan</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#c9c0ae]">
          First year of hiring is free. After that the Hiring plan is billed yearly.
        </p>
        <span className="mt-3 inline-flex text-sm font-medium text-[#7dcea0]">
          View payments →
        </span>
      </Link>
    </>
  )

  return (
    <div
      className={cn(
        'hiring-portal lg:grid lg:grid-cols-[16.25rem_minmax(0,1fr)]',
        messenger ? 'h-svh overflow-hidden' : 'min-h-svh',
      )}
    >
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col gap-6 overflow-y-auto bg-[var(--sidebar)] p-5 text-[var(--sidebar-foreground)]">
            <button type="button" className="absolute right-4 top-4" aria-label="Close" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 overflow-y-auto bg-[var(--sidebar)] p-5 text-[var(--sidebar-foreground)] lg:flex">
        {sidebar}
      </aside>

      <div className={cn('flex min-h-0 min-w-0 flex-col', messenger && 'h-full min-h-0 lg:h-svh')}>
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-[#e4ebe6] bg-white px-4 py-3 sm:px-6">
          <button type="button" className="grid size-10 place-items-center lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5 text-[var(--forest)]" />
          </button>
          <form onSubmit={onSearch} className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search freelancers, skills, or job titles…"
              className="h-11 w-full rounded-full border border-[#e4ebe6] bg-[#f4f7f5] pl-10 pr-12 text-sm outline-none placeholder:text-muted-foreground/80 focus:border-[#147a48] focus:bg-white"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#d7ddd8] bg-white px-1.5 text-[0.65rem] font-medium text-muted-foreground sm:inline">
              K
            </kbd>
          </form>
          <div ref={toolsRef} className="relative flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid size-10 place-items-center rounded-full text-[var(--forest)] hover:bg-[#eef3f0]"
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
              className="grid size-10 place-items-center rounded-full text-[var(--forest)] hover:bg-[#eef3f0]"
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
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--forest)] font-serif text-sm text-white">
                  {initials(person)}
                </span>
              )}
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-medium leading-tight text-[var(--forest)]">{person}</span>
                <span className="block text-xs text-muted-foreground">Employer</span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>

            {bellOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-white text-[var(--forest)] shadow-xl">
                <p className="border-b border-border px-4 py-3 text-sm font-medium">Waiting for you</p>
                {notes.data?.length ? (
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {notes.data.slice(0, 8).map((n, i) => (
                      <li key={`${n.title}-${i}`}>
                        <Link to={n.href || '/employer'} className="block px-4 py-2.5 hover:bg-muted" onClick={closeMenus}>
                          <p className="text-sm">{n.title}</p>
                          {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground">No new packets waiting.</p>
                )}
              </div>
            ) : null}

            {helpOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-white p-4 text-[var(--forest)] shadow-xl">
                <p className="text-sm font-medium">Hiring help</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Post a role on Atelier. Packets land here only after the candidate approves. We never auto-apply on LinkedIn, Indeed, or Upwork.
                </p>
              </div>
            ) : null}

            {accountOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-56 overflow-hidden rounded-2xl border border-border bg-white text-[var(--forest)] shadow-xl">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-medium">{person}</p>
                  <p className="text-xs text-muted-foreground">{company}</p>
                </div>
                <div className="p-2">
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => { closeMenus(); navigate('/employer/company') }}>
                    <Building2 className="size-4 opacity-70" />
                    Company profile
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => { closeMenus(); navigate('/employer/settings') }}>
                    <Settings className="size-4 opacity-70" />
                    Settings
                  </button>
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
              ? 'flex min-h-0 flex-col p-0 [&>*]:h-full [&>*]:min-h-0'
              : 'px-4 py-5 sm:px-6 sm:py-6 lg:px-8',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
