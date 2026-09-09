import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
  LineChart,
  LogOut,
  MessageSquare,
  MessagesSquare,
  MoreVertical,
  ScrollText,
  Search,
  Settings,
  User,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { BrandMark } from '@/components/ui/feedback'
import { displayName } from '@shared/types'
import { initials } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const PRIMARY: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/app/jobs', label: 'Matches', icon: Search },
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/applications', label: 'Packets', icon: FileText },
  { to: '/app/messages', label: 'Inbox', icon: MessagesSquare },
  { to: '/app/resume', label: 'Resume', icon: ScrollText },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/career', label: 'Coach', icon: LineChart },
]

interface Note {
  title: string
  body?: string
  href?: string
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const name = displayName(profile)
  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Note[]>('/api/notifications'),
  })
  const noteCount = notes.data?.length ?? 0
  const [bellOpen, setBellOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!toolsRef.current?.contains(e.target as Node)) {
        setBellOpen(false)
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="min-h-svh bg-[var(--paper)]">
      <header className="sticky top-0 z-40 border-b border-[#c9c0ae22] bg-[var(--forest)] text-[var(--paper)]">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5">
          <Link to="/app" className="shrink-0" aria-label="Atelier home">
            <BrandMark light compact />
          </Link>

          <nav className="flex min-w-0 flex-1 items-stretch justify-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PRIMARY.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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

          <div ref={toolsRef} className="relative flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMoreOpen((v) => !v)
                setBellOpen(false)
              }}
              className="flex max-w-[12rem] items-center gap-2 rounded-2xl border border-[#c9c0ae44] bg-[#1a332b] px-2 py-1.5 text-left sm:max-w-[14rem] sm:px-2.5"
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

            <button
              type="button"
              aria-label="Notifications"
              className="relative grid size-10 place-items-center text-white"
              onClick={() => {
                setBellOpen((v) => !v)
                setMoreOpen(false)
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
              aria-label="More"
              className="grid size-10 place-items-center text-white"
              onClick={() => {
                setMoreOpen((v) => !v)
                setBellOpen(false)
              }}
            >
              <MoreVertical className="size-5 stroke-[1.5]" />
            </button>

            {bellOpen ? (
              <div className="absolute right-3 top-[calc(100%-0.25rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-[var(--paper)] text-[var(--forest)] shadow-xl sm:right-5">
                <p className="border-b border-border px-4 py-3 text-sm font-medium">Waiting for you</p>
                {notes.data?.length ? (
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {notes.data.slice(0, 8).map((n, i) => (
                      <li key={`${n.title}-${i}`}>
                        <Link
                          to={n.href || '/app'}
                          className="block px-4 py-2.5 hover:bg-muted"
                          onClick={() => setBellOpen(false)}
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

            {moreOpen ? (
              <div className="absolute right-3 top-[calc(100%-0.25rem)] z-50 w-56 overflow-hidden rounded-2xl border border-border bg-[var(--paper)] text-[var(--forest)] shadow-xl sm:right-5">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">
                    Candidate
                  </p>
                </div>
                <div className="p-2">
                  <MenuLink to="/app/profile" icon={User} label="Your studio" onClick={() => setMoreOpen(false)} />
                  <MenuLink to="/app/interview" icon={MessageSquare} label="Interview" onClick={() => setMoreOpen(false)} />
                  <MenuLink to="/app/billing" icon={CreditCard} label="Plan" onClick={() => setMoreOpen(false)} />
                  <MenuLink to="/app/settings" icon={Settings} label="Settings" onClick={() => setMoreOpen(false)} />
                  <MenuLink to="/support" icon={CircleHelp} label="Help" onClick={() => setMoreOpen(false)} />
                </div>
                <p className="mx-3 mb-2 rounded-xl border border-[#c6a15b55] bg-[#f7f1e4] px-3 py-2 text-xs leading-relaxed">
                  Packets leave only after you approve.
                </p>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-sm hover:bg-muted"
                  onClick={() => void signOut().then(() => navigate('/'))}
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto min-w-0 w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
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
