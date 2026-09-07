import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Briefcase,
  FileText,
  LayoutDashboard,
  LineChart,
  Menu,
  MessageSquare,
  ScrollText,
  CreditCard,
  Settings,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/ui/feedback'
import { displayName } from '@shared/types'
import { initials } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const GROUPS: { label: string; items: { to: string; label: string; icon: LucideIcon; end?: boolean }[] }[] = [
  {
    label: 'Find',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/jobs', label: 'Jobs', icon: Briefcase },
    ],
  },
  {
    label: 'Apply',
    items: [
      { to: '/app/applications', label: 'Applications', icon: FileText },
      { to: '/app/resume', label: 'Resume', icon: ScrollText },
    ],
  },
  {
    label: 'Grow',
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
  avatarUrl,
  onSignOut,
}: {
  onNavigate: (path: string) => void
  noteCount: number
  name: string
  avatarUrl?: string
  onSignOut: () => void
}) {
  return (
    <>
      <button type="button" className="text-left" onClick={() => onNavigate('/app')}>
        <BrandMark light />
      </button>
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
      <div className="space-y-3 border-t border-[#c9c0ae22] pt-4 text-sm text-[#c9c0ae]">
        <div className="flex items-center gap-2 px-1">
          <Bell className="size-4" />
          {noteCount} new matches waiting
        </div>
        <div className="flex items-center gap-3 px-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-[#1f3d32] font-serif text-sm text-[var(--paper)]">
              {initials(name)}
            </span>
          )}
          <span className="truncate">{name}</span>
        </div>
        <Button variant="outline" className="w-full border-[#c9c0ae44] text-[#e7e1d4]" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </>
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
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[240px_1fr]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <BrandMark />
        <button type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="size-6" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col gap-8 bg-[var(--sidebar)] p-6 text-[var(--sidebar-foreground)]">
            <button type="button" className="absolute right-4 top-4" aria-label="Close" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-svh flex-col gap-8 bg-[var(--sidebar)] p-6 text-[var(--sidebar-foreground)] lg:flex">
        {sidebar}
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
