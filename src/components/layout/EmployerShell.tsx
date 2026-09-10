import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Briefcase, Inbox, LayoutDashboard, Menu, MessagesSquare, Plus, Timer, Wallet, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { prefetchRoute } from '@/lib/prefetch'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/ui/feedback'
import { cn, initials } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const LINKS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/employer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employer/jobs', label: 'Job posts', icon: Briefcase },
  { to: '/employer/jobs/new', label: 'Post a job', icon: Plus },
  { to: '/employer/inbox', label: 'Inbox', icon: Inbox },
  { to: '/employer/messages', label: 'Messages', icon: MessagesSquare },
  { to: '/employer/finances', label: 'Finances', icon: Wallet },
  { to: '/employer/ateliar', label: 'Time tracker', icon: Timer },
]

export function EmployerShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const messenger = location.pathname.startsWith('/employer/messages')
  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ title: string }[]>('/api/notifications'),
  })
  const name = profile.companyName || `${profile.firstName} ${profile.lastName}`.trim() || profile.email

  const sidebar = (
    <>
      <button type="button" className="text-left" onClick={() => navigate('/employer', { replace: true })}>
        <BrandMark light />
      </button>
      <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Hiring</p>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            replace
            onMouseEnter={() => prefetchRoute(l.to)}
            onFocus={() => prefetchRoute(l.to)}
            onClick={() => setOpen(false)}
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
      </nav>
      <div className="space-y-3 border-t border-[#c9c0ae22] pt-4 text-sm text-[#c9c0ae]">
        <div className="flex items-center gap-2 px-1">
          <Bell className="size-4" />
          {notes.data?.length ?? 0} inbox alerts
        </div>
        <div className="flex items-center gap-3 px-1">
          <span className="grid size-9 place-items-center rounded-full bg-[#1f3d32] font-serif text-sm text-[var(--paper)]">
            {initials(name)}
          </span>
          <span className="truncate">{name}</span>
        </div>
        <Button variant="outline" className="w-full border-[#c9c0ae44] text-[#e7e1d4]" onClick={() => void signOut().then(() => navigate('/', { replace: true }))}>
          Sign out
        </Button>
      </div>
    </>
  )

  return (
    <div
      className={cn(
        'atelier-app overflow-x-clip lg:grid lg:grid-cols-[240px_minmax(0,1fr)]',
        messenger ? 'flex h-svh flex-col overflow-hidden' : 'min-h-svh',
      )}
    >
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
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
      <main
        className={cn(
          'min-w-0 w-full',
          messenger
            ? 'flex min-h-0 flex-1 flex-col p-0 lg:h-svh [&>*]:h-full [&>*]:min-h-0'
            : 'mx-auto max-w-5xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-10',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
