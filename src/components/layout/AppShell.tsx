import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LineChart,
  LogOut,
  Menu,
  MessagesSquare,
  ScrollText,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { BrandMark } from '@/components/ui/feedback'
import { displayName } from '@shared/types'
import { initials } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: 'notes'
  chevron?: boolean
  gapBefore?: boolean
}

const NAV: NavItem[] = [
  { to: '/app/jobs', label: 'Search', icon: Search },
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/alerts', label: 'Alerts', icon: Bell, badge: 'notes' },
  { to: '/app/resume', label: 'Resume', icon: ScrollText, chevron: true, gapBefore: true },
  { to: '/app/applications', label: 'Packets', icon: FileText, chevron: true },
  { to: '/app/billing', label: 'Plan', icon: CreditCard, chevron: true },
  { to: '/app/messages', label: 'Messages', icon: MessagesSquare },
  { to: '/app/career', label: 'Coach', icon: LineChart },
]

function SidebarContent({
  onNavigate,
  noteCount,
  notes,
  name,
  email,
  avatarUrl,
  onSignOut,
}: {
  onNavigate: (path: string) => void
  noteCount: number
  notes: { title: string; body?: string; href?: string }[]
  name: string
  email: string
  avatarUrl?: string
  onSignOut: () => void
}) {
  const [menu, setMenu] = useState(false)
  const [alerts, setAlerts] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenu(false)
        setAlerts(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col text-[var(--forest)]" ref={menuRef}>
      <Link
        to="/"
        className="mb-5 px-1 font-serif text-lg leading-none text-[var(--forest)]"
        onClick={() => onNavigate('/')}
      >
        Atelier
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setAlerts(false)
            setMenu((v) => !v)
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left hover:bg-[#e7ece8]"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <span className="grid size-10 place-items-center rounded-full bg-[var(--forest)] font-serif text-sm text-[var(--paper)]">
              {initials(name)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block text-xs text-muted-foreground">Candidate</span>
          </span>
          <ChevronRight className={`size-4 shrink-0 text-muted-foreground transition ${menu ? 'rotate-90' : ''}`} />
        </button>
        {menu ? (
          <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="p-1.5">
              <MenuLink to="/app/profile" icon={User} label="Your studio" onClick={() => { setMenu(false); onNavigate('/app/profile') }} />
              <MenuLink to="/app/resume" icon={ScrollText} label="Resume" onClick={() => { setMenu(false); onNavigate('/app/resume') }} />
              <MenuLink to="/app/settings" icon={Settings} label="Settings" onClick={() => { setMenu(false); onNavigate('/app/settings') }} />
            </div>
            <p className="mx-2 mb-2 rounded-xl bg-[#f7f1e4] px-3 py-2 text-xs leading-relaxed">
              Packets leave only after you approve.
            </p>
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-sm hover:bg-muted"
              onClick={onSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        ) : null}
        {alerts ? (
          <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-border bg-white p-2 shadow-lg">
            {notes.length ? (
              notes.map((n) => (
                <Link
                  key={n.title}
                  to={n.href || '/app'}
                  onClick={() => {
                    setAlerts(false)
                    onNavigate(n.href || '/app')
                  }}
                  className="block rounded-xl px-3 py-2 hover:bg-muted"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                </Link>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">No new matches waiting.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="my-4 h-px bg-border" />

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
        {NAV.map((item) => {
          if (item.badge === 'notes') {
            return (
              <div key={item.label} className={item.gapBefore ? 'mt-5' : ''}>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false)
                    setAlerts((v) => !v)
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                    alerts ? 'bg-[#e7ece8] font-medium' : 'hover:bg-[#eef2ef]'
                  }`}
                >
                  <item.icon className="size-[18px] stroke-[1.6] text-[var(--forest)]" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {noteCount > 0 ? (
                    <span className="grid min-w-5 place-items-center rounded-full bg-[var(--copper)] px-1.5 text-[10px] font-semibold text-[var(--paper)]">
                      {noteCount > 9 ? '9+' : noteCount}
                    </span>
                  ) : null}
                </button>
              </div>
            )
          }
          return (
            <NavLink
              key={item.label + item.to}
              to={item.to}
              end={item.end}
              onClick={() => onNavigate(item.to)}
              className={({ isActive }) =>
                `${item.gapBefore ? 'mt-5 ' : ''}flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-[#e7ece8] font-medium text-[var(--forest)]' : 'text-[var(--forest)] hover:bg-[#eef2ef]'
                }`
              }
            >
              <item.icon className="size-[18px] stroke-[1.6]" />
              <span className="flex-1">{item.label}</span>
              {item.chevron ? <ChevronRight className="size-4 text-muted-foreground" /> : null}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

function MenuLink({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted">
      <Icon className="size-4 opacity-70" />
      {label}
    </Link>
  )
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ title: string; body?: string; href?: string }[]>('/api/notifications'),
  })
  const name = displayName(profile)

  const sidebar = (
    <SidebarContent
      name={name}
      email={profile.email}
      avatarUrl={profile.avatarUrl}
      noteCount={notes.data?.length ?? 0}
      notes={notes.data ?? []}
      onNavigate={(path) => {
        setOpen(false)
        if (path === '/') navigate('/')
      }}
      onSignOut={() => void signOut().then(() => navigate('/'))}
    />
  )

  return (
    <div className="min-h-svh bg-[var(--background)] lg:grid lg:grid-cols-[248px_1fr]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-[var(--paper)] px-4 py-3 lg:hidden">
        <BrandMark compact />
        <button type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="size-6" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-[#f3f5f3] p-4">
            <button type="button" className="absolute right-3 top-3" aria-label="Close" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-svh border-r border-border bg-[#f3f5f3] p-4 lg:flex">
        {sidebar}
      </aside>

      <main className="mx-auto min-w-0 w-full max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
