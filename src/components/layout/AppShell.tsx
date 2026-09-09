import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Briefcase,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  ScrollText,
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

const GROUPS: { label: string; items: { to: string; label: string; icon: LucideIcon; end?: boolean }[] }[] = [
  {
    label: 'Find',
    items: [
      { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
      { to: '/app/jobs', label: 'Matches', icon: Briefcase },
    ],
  },
  {
    label: 'Work',
    items: [
      { to: '/app/applications', label: 'Packets', icon: FileText },
      { to: '/app/messages', label: 'Messages', icon: MessagesSquare },
      { to: '/app/resume', label: 'Resume', icon: ScrollText },
    ],
  },
  {
    label: 'Studio',
    items: [
      { to: '/app/profile', label: 'Profile', icon: User },
      { to: '/app/interview', label: 'Interview', icon: MessageSquare },
      { to: '/app/career', label: 'Career coach', icon: LineChart },
      { to: '/app/billing', label: 'Billing', icon: CreditCard },
      { to: '/app/settings', label: 'Settings', icon: Settings },
    ],
  },
]

function SidebarContent({
  onNavigate,
  noteCount,
  name,
  email,
  avatarUrl,
  onSignOut,
}: {
  onNavigate: (path: string) => void
  noteCount: number
  name: string
  email: string
  avatarUrl?: string
  onSignOut: () => void
}) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <>
      <button type="button" className="text-left" onClick={() => onNavigate('/app')}>
        <BrandMark light />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-[#1f3d32]/70"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <span className="grid size-10 place-items-center rounded-full bg-[#1f3d32] font-serif text-sm text-[var(--paper)]">
              {initials(name)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-[var(--paper)]">{name}</span>
            <span className="block text-[0.68rem] uppercase tracking-[0.12em] text-[#c6a15b]">Candidate</span>
          </span>
          <ChevronDown className={`size-4 shrink-0 text-[#c9c0ae] transition ${menu ? 'rotate-180' : ''}`} />
        </button>
        {menu ? (
          <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[#c9c0ae33] bg-[var(--paper)] text-[var(--forest)] shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="p-2">
              <MenuLink to="/app/profile" icon={User} label="Your studio" onClick={() => { setMenu(false); onNavigate('/app/profile') }} />
              <MenuLink to="/app/resume" icon={ScrollText} label="Resume & packet" onClick={() => { setMenu(false); onNavigate('/app/resume') }} />
              <MenuLink to="/app/settings" icon={Settings} label="Settings" onClick={() => { setMenu(false); onNavigate('/app/settings') }} />
              <MenuLink to="/app/billing" icon={CreditCard} label="Plan" onClick={() => { setMenu(false); onNavigate('/app/billing') }} />
            </div>
            <p className="mx-3 mb-3 rounded-xl border border-[#c6a15b55] bg-[#f7f1e4] px-3 py-2 text-xs leading-relaxed text-[var(--forest)]">
              Packets leave Atelier only after you approve. We never auto-apply on other sites.
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
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => onNavigate(l.to)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-[#1f3d32] text-white' : 'text-[#d8d0c0] hover:bg-[#1f3d32]/70'
                    }`
                  }
                >
                  <l.icon className="size-4 opacity-80" />
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-2 border-t border-[#c9c0ae22] pt-4 text-sm text-[#c9c0ae]">
        <div className="flex items-center gap-2 px-1">
          <Bell className="size-4" />
          {noteCount} waiting
        </div>
        <Link to="/support" className="block px-1 text-[#c9c0ae] hover:text-[var(--paper)]">
          Help
        </Link>
      </div>
    </>
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
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted"
    >
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
    queryFn: () => api<{ title: string }[]>('/api/notifications'),
  })
  const name = displayName(profile)

  const sidebar = (
    <SidebarContent
      name={name}
      email={profile.email}
      avatarUrl={profile.avatarUrl}
      noteCount={notes.data?.length ?? 0}
      onNavigate={(path) => {
        setOpen(false)
        if (path === '/app') navigate('/app')
      }}
      onSignOut={() => void signOut().then(() => navigate('/'))}
    />
  )

  return (
    <div className="min-h-svh bg-[var(--paper)] lg:grid lg:grid-cols-[232px_1fr]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-[var(--paper)]/90 px-4 py-3 backdrop-blur lg:hidden">
        <BrandMark />
        <button type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="size-6" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col gap-6 bg-[var(--sidebar)] p-5 text-[var(--sidebar-foreground)]">
            <button type="button" className="absolute right-4 top-4" aria-label="Close" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-svh flex-col gap-6 bg-[var(--sidebar)] p-5 text-[var(--sidebar-foreground)] lg:flex">
        {sidebar}
      </aside>

      <main className="mx-auto min-w-0 w-full max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
