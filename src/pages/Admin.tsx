import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MessagesSquare,
  Search,
  Settings,
  Timer,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InviteEmployer } from '@/components/jobs/InviteEmployer'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { initials, money, prettyStatus } from '@/lib/utils'
import { formatHoursMinutes } from '@shared/tracker'
import { sourceLabel, type AccountRole } from '@shared/types'
import type { LucideIcon } from 'lucide-react'

interface AdminInvite {
  company: string
  title: string
  source: string
  listings: number
  sources: string[]
}

interface AdminAccount {
  id: string
  email: string
  name: string
  role: AccountRole
  companyName: string
  joinedAt?: string
}

interface AdminDashboard {
  role: AccountRole
  email: string
  name: string
  counts: {
    candidates: number
    employers: number
    admins: number
    jobs: number
    companiesToInvite: number
    packets: number
    people: number
    hired: number
    messages: number
    liveClocks: number
    trackerHours: number
    financeReceived: number
  }
  accounts: AdminAccount[]
  invites: AdminInvite[]
  boards: { source: string; count: number }[]
  listings: {
    id: string
    title: string
    company: string
    source: string
    remote: boolean
    postedAt: string
    atelier: boolean
  }[]
  packetsList: {
    id: string
    status: string
    jobTitle: string
    company: string
    candidate: string
    createdAt: string
  }[]
  tracker: {
    live: number
    hours: number
    sessions: {
      id: string
      jobTitle: string
      company: string
      candidate: string
      startedAt: string
      endedAt: string
      seconds: number
      live: boolean
    }[]
  }
  finance: {
    received: number
    pending: number
    available: number
    withdrawn: number
    currency: string
    entries: {
      id: string
      company: string
      jobTitle: string
      amount: number
      status: string
      kind: string
      createdAt: string
    }[]
  }
  inbox: {
    messages: number
    threads: number
    recent: { id: string; body: string; at: string; applicationId: string; senderRole: string }[]
  }
  activity: { kind: 'person' | 'invite'; title: string; body: string; at: string }[]
  promoteSql: string
}

type DeskView = 'pulse' | 'invite' | 'people' | 'listings' | 'keys' | 'packets' | 'tracker' | 'inbox' | 'finances' | 'reports'
type PeopleFilter = 'all' | AccountRole

interface NavLinkItem {
  kind: 'link'
  id: DeskView
  label: string
  icon: LucideIcon
  people?: PeopleFilter
}

interface NavGroupItem {
  kind: 'group'
  id: string
  label: string
  icon: LucideIcon
  children: NavLinkItem[]
}

type NavEntry = NavLinkItem | NavGroupItem

const NAV: NavEntry[] = [
  { kind: 'link', id: 'pulse', label: 'Dashboard', icon: LayoutDashboard },
  {
    kind: 'group',
    id: 'users',
    label: 'Users',
    icon: Users,
    children: [
      { kind: 'link', id: 'people', label: 'Candidates', icon: User, people: 'candidate' },
      { kind: 'link', id: 'people', label: 'Employers', icon: Building2, people: 'employer' },
      { kind: 'link', id: 'people', label: 'All users', icon: Users, people: 'all' },
    ],
  },
  {
    kind: 'group',
    id: 'work',
    label: 'Jobs & Projects',
    icon: Briefcase,
    children: [
      { kind: 'link', id: 'listings', label: 'Jobs', icon: Briefcase },
      { kind: 'link', id: 'packets', label: 'Packets', icon: FileText },
      { kind: 'link', id: 'invite', label: 'Invite', icon: Mail },
    ],
  },
  { kind: 'link', id: 'inbox', label: 'Inbox', icon: MessagesSquare },
  { kind: 'link', id: 'tracker', label: 'Tracker', icon: Timer },
  { kind: 'link', id: 'finances', label: 'Finances', icon: Wallet },
  { kind: 'link', id: 'reports', label: 'Reports', icon: BarChart3 },
  { kind: 'link', id: 'keys', label: 'Settings', icon: Settings },
]

const MOBILE_NAV: { id: DeskView; label: string; people?: PeopleFilter }[] = NAV.flatMap((item) =>
  item.kind === 'group' ? item.children.map((child) => ({ id: child.id, label: child.label, people: child.people })) : [{ id: item.id, label: item.label, people: item.people }],
)

export function AdminPage() {
  const { profile, signOut } = useAuth()
  const qc = useQueryClient()
  const [view, setView] = useState<DeskView>('pulse')
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [peopleQuery, setPeopleQuery] = useState('')
  const [peopleRole, setPeopleRole] = useState<PeopleFilter>('all')
  const [email, setEmail] = useState('')
  const [nextRole, setNextRole] = useState<'admin' | 'employer' | 'candidate'>('admin')
  const [copied, setCopied] = useState(false)
  const [picked, setPicked] = useState('')
  const [range, setRange] = useState<'7D' | '30D' | '3M' | '1Y'>('30D')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ users: true, work: true })
  const dash = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api<AdminDashboard>('/api/admin/dashboard'),
  })
  const promote = useMutation({
    mutationFn: () => api('/api/admin/role', { method: 'POST', body: JSON.stringify({ email, role: nextRole }) }),
    onSuccess: () => {
      setEmail('')
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  const data = dash.data
  const superAdmin = (data?.role ?? profile.role) === 'super_admin'
  const sql = data?.promoteSql ?? "update public.profiles set role = 'admin' where email = 'you@example.com';"
  const name = data?.name || profile.email || 'Admin'
  const counts = data?.counts
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())

  const sources = useMemo(() => {
    const set = new Set<string>()
    for (const row of data?.invites ?? []) for (const s of row.sources) set.add(s)
    return [...set].sort()
  }, [data?.invites])

  const invites = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.invites ?? []).filter((row) => {
      if (source !== 'all' && !row.sources.includes(source)) return false
      if (!q) return true
      return `${row.company} ${row.title} ${row.sources.map(sourceLabel).join(' ')}`.toLowerCase().includes(q)
    })
  }, [data?.invites, query, source])

  const selected = invites.find((row) => row.company === picked) ?? invites[0]

  const people = useMemo(() => {
    const q = (view === 'people' ? peopleQuery : query).trim().toLowerCase()
    return (data?.accounts ?? []).filter((row) => {
      if (peopleRole !== 'all' && row.role !== peopleRole) return false
      if (!q) return true
      return `${row.name} ${row.email} ${row.companyName}`.toLowerCase().includes(q)
    })
  }, [data?.accounts, peopleQuery, peopleRole, query, view])

  const searchListings = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.listings ?? []).filter((row) => {
      if (!q) return true
      return `${row.title} ${row.company} ${row.source}`.toLowerCase().includes(q)
    })
  }, [data?.listings, query])

  const packets = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.packetsList ?? []).filter((row) => {
      if (!q) return true
      return `${row.candidate} ${row.jobTitle} ${row.company} ${row.status}`.toLowerCase().includes(q)
    })
  }, [data?.packetsList, query])

  const sessions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.tracker?.sessions ?? []).filter((row) => {
      if (!q) return true
      return `${row.candidate} ${row.jobTitle} ${row.company}`.toLowerCase().includes(q)
    })
  }, [data?.tracker?.sessions, query])

  const ledger = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.finance?.entries ?? []).filter((row) => {
      if (!q) return true
      return `${row.company} ${row.jobTitle} ${row.status} ${row.kind}`.toLowerCase().includes(q)
    })
  }, [data?.finance?.entries, query])

  const messages = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.inbox?.recent ?? []).filter((row) => {
      if (!q) return true
      return `${row.body} ${row.senderRole}`.toLowerCase().includes(q)
    })
  }, [data?.inbox?.recent, query])

  const candidates = (data?.accounts ?? []).filter((a) => a.role === 'candidate')

  function onPromote(e: FormEvent) {
    e.preventDefault()
    promote.mutate()
  }

  function copySql() {
    void navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  function go(next: DeskView, role: PeopleFilter = 'all') {
    setView(next)
    if (next === 'people') setPeopleRole(role)
    if (next === 'people') setOpenGroups((g) => ({ ...g, users: true }))
    if (next === 'listings' || next === 'packets' || next === 'invite') setOpenGroups((g) => ({ ...g, work: true }))
    setNavOpen(false)
    setQuery('')
  }

  function toggleGroup(id: string) {
    setOpenGroups((g) => ({ ...g, [id]: !g[id] }))
  }

  function linkActive(item: NavLinkItem) {
    if (item.people) return view === 'people' && peopleRole === item.people
    if (item.id === 'people') return view === 'people' && peopleRole === 'all'
    return view === item.id
  }

  const searchValue = view === 'people' ? peopleQuery : query
  const onSearch = (value: string) => (view === 'people' ? setPeopleQuery(value) : setQuery(value))
  const searchHint =
    view === 'tracker'
      ? 'Search tracker sessions'
      : view === 'finances'
        ? 'Search pay ledger'
        : view === 'inbox'
          ? 'Search messages'
          : view === 'packets'
            ? 'Search packets'
            : 'Search users, jobs, packets, or companies'

  return (
    <div className="min-h-svh bg-[#f3f5f4] lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="hidden bg-[#13261f] text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/brand/atelier-logo.jpg" alt="Atelier" className="size-9 rounded-lg object-cover" />
          <div>
            <p className="font-serif text-lg leading-none">Atelier</p>
            <p className="mt-1 text-[0.65rem] text-white/55">Admin Panel</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {NAV.map((item) => {
            if (item.kind === 'group') {
              const open = Boolean(openGroups[item.id])
              const childOn = item.children.some(linkActive)
              return (
                <div key={item.id}>
                  <SideRow
                    icon={item.icon}
                    label={item.label}
                    active={childOn && !open}
                    open={open}
                    onClick={() => toggleGroup(item.id)}
                  />
                  {open
                    ? item.children.map((child) => (
                        <SideRow
                          key={`${child.label}-${child.people ?? ''}`}
                          icon={child.icon}
                          label={child.label}
                          active={linkActive(child)}
                          indent
                          onClick={() => go(child.id, child.people ?? 'all')}
                        />
                      ))
                    : null}
                </div>
              )
            }
            return (
              <SideRow
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={linkActive(item)}
                onClick={() => go(item.id, item.people ?? 'all')}
              />
            )
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 px-5 py-5">
          <div className="flex items-center gap-2">
            <img src="/brand/atelier-logo.jpg" alt="" className="size-8 rounded-md object-cover" />
            <div>
              <p className="text-sm">Atelier</p>
              <p className="text-[0.65rem] text-white/50">AI-Powered Job Matching</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e4e8e5] bg-white px-4 py-3 sm:px-6">
          <button type="button" className="rounded-lg border border-[#e4e8e5] px-3 py-2 text-sm lg:hidden" onClick={() => setNavOpen((v) => !v)}>
            Menu
          </button>
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
            <Input
              className="h-10 rounded-xl border-[#e4e8e5] bg-[#f7f8f7] pl-10"
              placeholder={searchHint}
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
            />
          </label>
          <button type="button" className="relative grid size-10 place-items-center rounded-full text-[#5c635f]" aria-label="Alerts" onClick={() => go('inbox')}>
            <Bell className="size-5" />
            {counts?.messages || counts?.companiesToInvite ? (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#b85c38]" />
            ) : null}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-[#e4e8e5] bg-white py-1 pl-1 pr-3">
            <img src="/brand/atelier-logo.jpg" alt="" className="size-8 rounded-full object-cover" />
            <span className="hidden text-sm sm:block">{name.split(' ')[0] || 'Admin'}</span>
          </div>
          <button type="button" className="grid size-10 place-items-center text-[#5c635f]" aria-label="Sign out" onClick={() => void signOut()}>
            <LogOut className="size-4" />
          </button>
        </header>

        {navOpen ? (
          <div className="flex gap-1 overflow-x-auto bg-[#13261f] px-3 py-2 lg:hidden">
            {MOBILE_NAV.map((item) => (
              <button
                key={`${item.label}-m`}
                type="button"
                onClick={() => go(item.id, item.people ?? 'all')}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-white/80"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <main className="space-y-5 px-4 py-6 sm:px-6">
          {dash.isError ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-[#b85c38]">
              {dash.error instanceof Error ? dash.error.message : 'Could not load the admin panel.'}
            </div>
          ) : null}

          {view === 'pulse' ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Admin Dashboard</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Platform overview and key metrics at a glance.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#e4e8e5] bg-white px-3 py-2 text-sm text-[#5c635f]">
                  <Calendar className="size-4" />
                  {monthLabel}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Users} tone="green" label="Total Users" value={counts?.people ?? 0} hint="On this desk" />
                <MetricCard icon={Briefcase} tone="blue" label="Active Jobs" value={counts?.jobs ?? 0} hint="Scored listings" />
                <MetricCard icon={FileText} tone="teal" label="Total Packets" value={counts?.packets ?? 0} hint="Applications in studio" />
                <MetricCard icon={Mail} tone="gold" label="Invite Queue" value={counts?.companiesToInvite ?? 0} hint="Companies to invite" />
                <MetricCard icon={Timer} tone="green" label="Tracker" value={formatHoursMinutes(counts?.trackerHours ?? 0)} hint={`${counts?.liveClocks ?? 0} live clocks`} />
                <MetricCard icon={MessagesSquare} tone="blue" label="Inbox" value={counts?.messages ?? 0} hint="Studio messages" />
                <MetricCard icon={Wallet} tone="gold" label="Finances" value={money(counts?.financeReceived ?? 0)} hint="Received from employers" />
                <MetricCard icon={Briefcase} tone="teal" label="Hired" value={counts?.hired ?? 0} hint="Offers and hires" />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)_17.5rem]">
                <div className="space-y-4 xl:col-span-2">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.75fr)]">
                    <Panel>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-sans text-base font-semibold">Listing growth</h2>
                        <div className="flex rounded-full bg-[#f3f5f4] p-1 text-xs">
                          {(['7D', '30D', '3M', '1Y'] as const).map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setRange(id)}
                              className={`rounded-full px-2.5 py-1 ${range === id ? 'bg-[#14a35a] text-white' : 'text-[#5c635f]'}`}
                            >
                              {id}
                            </button>
                          ))}
                        </div>
                      </div>
                      <GrowthChart boards={data?.boards ?? []} />
                    </Panel>
                    <Panel>
                      <h2 className="font-sans text-base font-semibold">User breakdown</h2>
                      <UserDonut
                        candidates={counts?.candidates ?? 0}
                        employers={counts?.employers ?? 0}
                        admins={counts?.admins ?? 0}
                      />
                    </Panel>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Panel>
                      <div className="flex items-center justify-between">
                        <h2 className="font-sans text-base font-semibold">Recent Jobs</h2>
                        <button type="button" className="text-sm text-[#14a35a]" onClick={() => go('listings')}>
                          View all jobs
                        </button>
                      </div>
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[28rem] text-left text-sm">
                          <thead className="text-xs text-[#8a918c]">
                            <tr>
                              <th className="pb-2 font-medium">Job Title</th>
                              <th className="pb-2 font-medium">Company</th>
                              <th className="pb-2 font-medium">Board</th>
                              <th className="pb-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data?.listings ?? []).slice(0, 5).map((row) => (
                              <tr key={row.id} className="border-t border-[#eef1ee]">
                                <td className="py-3 font-medium text-[#161c19]">{row.title}</td>
                                <td className="py-3 text-[#5c635f]">{row.company}</td>
                                <td className="py-3">{sourceLabel(row.source)}</td>
                                <td className="py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-xs ${row.atelier ? 'bg-[#e8f6ee] text-[#147a48]' : 'bg-[#eef1ee] text-[#5c635f]'}`}>
                                    {row.atelier ? 'Atelier' : row.remote ? 'Open' : 'On-site'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                    <Panel>
                      <div className="flex items-center justify-between">
                        <h2 className="font-sans text-base font-semibold">Top candidates</h2>
                        <button type="button" className="text-sm text-[#14a35a]" onClick={() => go('people', 'candidate')}>
                          View all
                        </button>
                      </div>
                      <ul className="mt-4 space-y-3">
                        {candidates.slice(0, 5).map((row) => (
                          <li key={row.id} className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-sm font-medium text-[#147a48]">
                              {initials(row.name || row.email)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{row.name}</span>
                              <span className="block truncate text-xs text-[#8a918c]">{row.email}</span>
                            </span>
                          </li>
                        ))}
                        {!candidates.length ? <li className="text-sm text-[#8a918c]">No candidates yet.</li> : null}
                      </ul>
                    </Panel>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Panel>
                      <div className="flex items-center justify-between">
                        <h2 className="font-sans text-base font-semibold">Notifications</h2>
                      </div>
                      <ul className="mt-4 space-y-3 text-sm">
                        <NoteDot color="#ef4444" text={`${counts?.companiesToInvite ?? 0} companies waiting on an invite.`} />
                        <NoteDot color="#22c55e" text={`${counts?.liveClocks ?? 0} live tracker clocks · ${formatHoursMinutes(counts?.trackerHours ?? 0)} logged.`} />
                        <NoteDot color="#3b82f6" text={`${counts?.messages ?? 0} studio messages · ${counts?.packets ?? 0} packets.`} />
                        <NoteDot color="#14a35a" text="Packets leave only after a candidate approves." />
                      </ul>
                    </Panel>
                    <div className="overflow-hidden rounded-2xl bg-[#13261f] p-5 text-white">
                      <img src="/brand/atelier-logo.jpg" alt="" className="size-12 rounded-xl object-cover" />
                      <h2 className="mt-4 font-serif text-2xl">Grow the Atelier desk</h2>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">
                        Invite employers from other boards so approved packets can land in an Atelier inbox.
                      </p>
                      <Button variant="paper" className="mt-4" onClick={() => go('invite')}>
                        Invite a company
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Panel className="bg-[#eef8f1]">
                    <h2 className="font-sans text-base font-semibold">Quick Actions</h2>
                    <div className="mt-3 divide-y divide-[#d7eadc]">
                      <QuickRow label="Open tracker" onClick={() => go('tracker')} />
                      <QuickRow label="Review inbox" onClick={() => go('inbox')} />
                      <QuickRow label="Finances" onClick={() => go('finances')} />
                      <QuickRow label="Invite an employer" onClick={() => go('invite')} />
                      <QuickRow label="Manage jobs" onClick={() => go('listings')} />
                    </div>
                  </Panel>
                  <Panel>
                    <h2 className="font-sans text-base font-semibold">Recent Activity</h2>
                    <ul className="mt-4 space-y-4">
                      {(data?.activity ?? []).slice(0, 6).map((row, i) => (
                        <li key={`${row.title}-${i}`} className="flex gap-3 text-sm">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                            {initials(row.title)}
                          </span>
                          <span>
                            <span className="block font-medium">{row.title}</span>
                            <span className="text-xs text-[#8a918c]">{row.body}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </div>
              </div>
            </>
          ) : null}

          {view === 'invite' ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <Panel>
                <h2 className="font-sans text-lg font-semibold">Invite employers</h2>
                <p className="mt-1 text-sm text-[#5c635f]">
                  {invites.length} of {data?.invites.length ?? 0} off-platform companies
                </p>
                {sources.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Chip active={source === 'all'} onClick={() => setSource('all')} label="All boards" />
                    {sources.map((s) => (
                      <Chip key={s} active={source === s} onClick={() => setSource(s)} label={sourceLabel(s)} />
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto">
                  {invites.map((row) => (
                    <button
                      key={row.company}
                      type="button"
                      onClick={() => setPicked(row.company)}
                      className={`w-full rounded-xl border px-4 py-3 text-left ${
                        selected?.company === row.company ? 'border-[#13261f] bg-[#f3f8f5]' : 'border-[#eef1ee] hover:border-[#13261f]'
                      }`}
                    >
                      <p className="font-medium">{row.company}</p>
                      <p className="mt-0.5 text-sm text-[#5c635f]">
                        {row.title} · {row.listings} listings
                      </p>
                    </button>
                  ))}
                </div>
              </Panel>
              <div className="rounded-2xl bg-[#13261f] p-6 text-white">
                {selected ? (
                  <InviteEmployer tone="studio" job={{ title: selected.title, company: selected.company, source: selected.source }} />
                ) : (
                  <p className="text-sm text-white/70">Pick a company to write their invite.</p>
                )}
              </div>
            </div>
          ) : null}

          {view === 'people' ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <Panel>
                <h2 className="font-sans text-lg font-semibold">Users</h2>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(['all', 'admin', 'super_admin', 'employer', 'candidate'] as const).map((role) => (
                    <Chip key={role} active={peopleRole === role} onClick={() => setPeopleRole(role)} label={role === 'all' ? 'All' : role.replace('_', ' ')} />
                  ))}
                </div>
                <div className="mt-4 divide-y divide-[#eef1ee]">
                  {people.map((row) => (
                    <div key={row.id} className="flex items-center gap-3 py-3">
                      <span className="grid size-10 place-items-center rounded-full bg-[#e8f6ee] text-sm font-medium text-[#147a48]">
                        {initials(row.name || row.email)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="truncate text-sm text-[#8a918c]">{row.email}</p>
                      </div>
                      <span className="rounded-full bg-[#f3f5f4] px-2.5 py-0.5 text-xs capitalize">{row.role.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              {superAdmin ? (
                <Panel>
                  <h2 className="font-sans text-base font-semibold">Change a role</h2>
                  <form className="mt-4 space-y-3" onSubmit={onPromote}>
                    <Input type="email" required placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <select className="h-10 w-full rounded-lg border border-[#e4e8e5] px-3 text-sm" value={nextRole} onChange={(e) => setNextRole(e.target.value as typeof nextRole)}>
                      <option value="admin">admin</option>
                      <option value="employer">employer</option>
                      <option value="candidate">candidate</option>
                    </select>
                    <Button variant="copper" type="submit" disabled={promote.isPending}>
                      {promote.isPending ? 'Saving…' : 'Update role'}
                    </Button>
                  </form>
                </Panel>
              ) : null}
            </div>
          ) : null}

          {view === 'listings' ? (
            <Panel>
              <h2 className="font-sans text-lg font-semibold">Jobs</h2>
              <DeskTable
                columns={['Job Title', 'Company', 'Board', 'Posted', 'Status']}
                rows={searchListings.map((row) => [row.title, row.company, sourceLabel(row.source), row.postedAt || '—', row.atelier ? 'Atelier' : 'Open'])}
                empty="No jobs match this search."
              />
            </Panel>
          ) : null}

          {view === 'packets' ? (
            <Panel>
              <h2 className="font-sans text-lg font-semibold">Packets</h2>
              <p className="mt-2 text-sm text-[#5c635f]">{counts?.packets ?? 0} packets in the studio.</p>
              <DeskTable
                columns={['Candidate', 'Role', 'Company', 'Status', 'Created']}
                rows={packets.map((row) => [row.candidate, row.jobTitle, row.company || '—', prettyStatus(row.status), day(row.createdAt)])}
                empty="No packets yet."
              />
            </Panel>
          ) : null}

          {view === 'tracker' ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard icon={Timer} tone="green" label="Hours logged" value={formatHoursMinutes(data?.tracker?.hours ?? 0)} hint="Across hired roles" />
                <MetricCard icon={Timer} tone="teal" label="Live clocks" value={data?.tracker?.live ?? 0} hint="Running now" />
                <MetricCard icon={Briefcase} tone="gold" label="Hired roles" value={counts?.hired ?? 0} hint="Tracker opens after hire" />
              </div>
              <Panel>
                <h2 className="font-sans text-lg font-semibold">Atelier time tracker</h2>
                <p className="mt-1 text-sm text-[#5c635f]">Hours candidates log after an Atelier hire. Outside boards never see this clock.</p>
                <DeskTable
                  columns={['Candidate', 'Role', 'Company', 'Time', 'State']}
                  rows={sessions.map((row) => [
                    row.candidate,
                    row.jobTitle,
                    row.company,
                    formatHoursMinutes(row.seconds),
                    row.live ? 'Live' : 'Stopped',
                  ])}
                  empty="No tracker sessions yet."
                />
              </Panel>
            </div>
          ) : null}

          {view === 'inbox' ? (
            <Panel>
              <h2 className="font-sans text-lg font-semibold">Inbox</h2>
              <p className="mt-1 text-sm text-[#5c635f]">
                {counts?.messages ?? 0} messages across {data?.inbox?.threads ?? 0} recent threads. Studio chat opens after a packet is sent.
              </p>
              <ul className="mt-5 divide-y divide-[#eef1ee]">
                {messages.map((row) => (
                  <li key={row.id} className="py-3">
                    <p className="text-xs capitalize text-[#8a918c]">
                      {row.senderRole || 'studio'} · {day(row.at)}
                    </p>
                    <p className="mt-1 text-sm text-[#161c19]">{row.body || '—'}</p>
                  </li>
                ))}
                {!messages.length ? <li className="py-6 text-sm text-[#8a918c]">No studio messages yet.</li> : null}
              </ul>
            </Panel>
          ) : null}

          {view === 'finances' ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Wallet} tone="green" label="Received" value={money(data?.finance?.received ?? 0, data?.finance?.currency)} hint="From employers" />
                <MetricCard icon={Wallet} tone="gold" label="Pending" value={money(data?.finance?.pending ?? 0, data?.finance?.currency)} hint="Not yet available" />
                <MetricCard icon={Wallet} tone="teal" label="Available" value={money(data?.finance?.available ?? 0, data?.finance?.currency)} hint="Ready to withdraw" />
                <MetricCard icon={Wallet} tone="blue" label="Withdrawn" value={money(data?.finance?.withdrawn ?? 0, data?.finance?.currency)} hint="Sent to candidates" />
              </div>
              <Panel>
                <h2 className="font-sans text-lg font-semibold">Pay ledger</h2>
                <p className="mt-1 text-sm text-[#5c635f]">Employer pay stays on Atelier. Outside boards are not involved.</p>
                <DeskTable
                  columns={['Company', 'Role', 'Amount', 'Kind', 'Status', 'Date']}
                  rows={ledger.map((row) => [
                    row.company || '—',
                    row.jobTitle || '—',
                    money(row.amount, data?.finance?.currency),
                    prettyStatus(row.kind),
                    prettyStatus(row.status),
                    day(row.createdAt),
                  ])}
                  empty="No ledger entries yet."
                />
              </Panel>
            </div>
          ) : null}

          {view === 'reports' ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Users} tone="green" label="People" value={counts?.people ?? 0} hint={`${counts?.candidates ?? 0} candidates`} />
                <MetricCard icon={FileText} tone="teal" label="Packets" value={counts?.packets ?? 0} hint={`${counts?.hired ?? 0} hired`} />
                <MetricCard icon={Timer} tone="gold" label="Tracker" value={formatHoursMinutes(counts?.trackerHours ?? 0)} hint={`${counts?.liveClocks ?? 0} live`} />
                <MetricCard icon={Wallet} tone="blue" label="Received" value={money(counts?.financeReceived ?? 0)} hint="Pay on Atelier" />
              </div>
              <Panel>
                <h2 className="font-sans text-lg font-semibold">Listings by board</h2>
                <DeskTable
                  columns={['Board', 'Listings']}
                  rows={(data?.boards ?? []).map((row) => [sourceLabel(row.source), String(row.count)])}
                  empty="No board mix yet."
                />
              </Panel>
            </div>
          ) : null}

          {view === 'keys' ? (
            <Panel className="max-w-xl">
              <h2 className="font-sans text-lg font-semibold">Settings</h2>
              <p className="mt-2 text-sm text-[#5c635f]">Promote staff in Supabase. Signup cannot grant admin.</p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[#13261f] p-4 text-xs text-white/80">{sql}</pre>
              <Button variant="outline" className="mt-3" type="button" onClick={copySql}>
                {copied ? 'Copied' : 'Copy SQL'}
              </Button>
            </Panel>
          ) : null}
        </main>
      </div>
    </div>
  )
}

function SideRow({
  icon: Icon,
  label,
  active,
  open,
  indent,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  open?: boolean
  indent?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
        indent ? 'pl-9' : ''
      } ${active ? 'bg-[#1f3d32] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!indent ? <ChevronRight className={`size-4 shrink-0 text-white/35 ${open ? 'rotate-90' : ''}`} /> : null}
    </button>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(19,38,31,0.06)] ${className}`}>{children}</section>
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  hint: string
  tone: 'green' | 'blue' | 'teal' | 'gold'
}) {
  const tones = {
    green: 'bg-[#e8f6ee] text-[#147a48]',
    blue: 'bg-[#e8f1fb] text-[#2563eb]',
    teal: 'bg-[#e6f7f4] text-[#0f766e]',
    gold: 'bg-[#f7f1e4] text-[#b85c38]',
  }
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
      <div className="flex items-start gap-3">
        <span className={`grid size-11 place-items-center rounded-full ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-[#5c635f]">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="mt-1 text-xs text-[#14a35a]">{hint}</p>
        </div>
      </div>
    </div>
  )
}

function DeskTable({ columns, rows, empty }: { columns: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="text-xs text-[#8a918c]">
          <tr>
            {columns.map((col) => (
              <th key={col} className="pb-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row[0]}-${i}`} className="border-t border-[#eef1ee]">
              {row.map((cell, j) => (
                <td key={`${i}-${j}`} className={`py-3 ${j === 0 ? 'font-medium' : 'text-[#5c635f]'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p className="py-6 text-sm text-[#8a918c]">{empty}</p> : null}
    </div>
  )
}

function day(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

function GrowthChart({ boards }: { boards: { source: string; count: number }[] }) {
  const top = boards.slice(0, 8)
  const max = Math.max(1, ...top.map((b) => b.count))
  const w = 640
  const h = 200
  const pad = 24
  const pts = top.map((b, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, top.length - 1)
    const y = h - pad - (b.count / max) * (h - pad * 2)
    return { x, y }
  })
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const line2 = pts.map((p, i) => `${p.x},${Math.min(h - pad, p.y + 18 + (i % 3) * 4)}`).join(' ')
  const area = pts.length ? `${pad},${h - pad} ${line} ${w - pad},${h - pad}` : ''
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full" role="img" aria-label="Listings by board">
        <defs>
          <linearGradient id="adminGrowth" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14a35a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#14a35a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area ? <polygon points={area} fill="url(#adminGrowth)" /> : null}
        {line ? <polyline points={line} fill="none" stroke="#14a35a" strokeWidth="3" strokeLinecap="round" /> : null}
        {line2 ? <polyline points={line2} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" /> : null}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-[0.7rem] text-[#8a918c]">
        {top.map((b) => (
          <span key={b.source}>
            {sourceLabel(b.source)} · {b.count}
          </span>
        ))}
      </div>
    </div>
  )
}

function UserDonut({ candidates, employers, admins }: { candidates: number; employers: number; admins: number }) {
  const total = Math.max(1, candidates + employers + admins)
  const r = 58
  const c = 2 * Math.PI * r
  const segs = [
    { n: candidates, color: '#14a35a', label: 'Candidates' },
    { n: employers, color: '#3b82f6', label: 'Employers' },
    { n: admins, color: '#86efac', label: 'Admins' },
  ]
  let offset = 0
  return (
    <div className="mt-3 flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="size-40 shrink-0">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#eef1ee" strokeWidth="18" />
        {segs.map((seg) => {
          const len = (seg.n / total) * c
          const dash = `${len} ${c - len}`
          const el = (
            <circle
              key={seg.label}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 80 80)"
            />
          )
          offset += len
          return el
        })}
        <text x="80" y="76" textAnchor="middle" className="fill-[#161c19]" fontSize="22" fontWeight="600">
          {candidates + employers + admins}
        </text>
        <text x="80" y="96" textAnchor="middle" className="fill-[#8a918c]" fontSize="10">
          Total Users
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {segs.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: seg.color }} />
              {seg.label}
            </span>
            <span className="tabular-nums text-[#5c635f]">
              {seg.n.toLocaleString()} · {Math.round((seg.n / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QuickRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between py-3 text-sm hover:text-[#147a48]">
      {label}
      <span className="text-[#8a918c]">›</span>
    </button>
  )
}

function NoteDot({ color, text }: { color: string; text: string }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: color }} />
      <span>{text}</span>
    </li>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs capitalize ${active ? 'bg-[#13261f] text-white' : 'bg-[#f3f5f4] text-[#5c635f]'}`}
    >
      {label}
    </button>
  )
}
