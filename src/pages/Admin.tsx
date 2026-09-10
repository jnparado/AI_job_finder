import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  LayoutGrid,
  LogOut,
  Mail,
  ScrollText,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { BrandMark } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InviteEmployer } from '@/components/jobs/InviteEmployer'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { greeting, initials } from '@/lib/utils'
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
  activity: { kind: 'person' | 'invite'; title: string; body: string; at: string }[]
  promoteSql: string
}

type DeskView = 'pulse' | 'invite' | 'people' | 'listings' | 'keys'

const NAV: { id: DeskView; label: string; icon: LucideIcon }[] = [
  { id: 'pulse', label: 'Pulse', icon: LayoutGrid },
  { id: 'invite', label: 'Invite', icon: Mail },
  { id: 'people', label: 'People', icon: Users },
  { id: 'listings', label: 'Listings', icon: ScrollText },
  { id: 'keys', label: 'Keys', icon: Sparkles },
]

export function AdminPage() {
  const { profile, signOut } = useAuth()
  const qc = useQueryClient()
  const [view, setView] = useState<DeskView>('pulse')
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [peopleQuery, setPeopleQuery] = useState('')
  const [peopleRole, setPeopleRole] = useState<'all' | AccountRole>('all')
  const [email, setEmail] = useState('')
  const [nextRole, setNextRole] = useState<'admin' | 'employer' | 'candidate'>('admin')
  const [copied, setCopied] = useState(false)
  const [picked, setPicked] = useState('')
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
  const first = name.split(/\s+/)[0] || name
  const counts = data?.counts

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
    const q = (view === 'pulse' ? query : peopleQuery).trim().toLowerCase()
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

  function go(next: DeskView) {
    setView(next)
    setNavOpen(false)
    setQuery('')
  }

  return (
    <div className="atelier-app min-h-svh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[var(--forest)] text-[var(--paper)] lg:flex lg:flex-col">
        <span className="atelier-filament pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-[#c6a15b] to-transparent" />
        <div className="px-5 pb-4 pt-6">
          <BrandMark light />
          <p className="mt-4 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#c6a15b]">Staff atelier</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
                view === item.id ? 'bg-[#c6a15b18] text-[#f4e4b8]' : 'text-[#d8d0c0] hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="size-4 opacity-80" />
              {item.label}
              {item.id === 'invite' && counts?.companiesToInvite ? (
                <span className="ml-auto rounded-full bg-[#c6a15b] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--forest)]">
                  {counts.companiesToInvite}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        <p className="px-5 py-5 text-xs leading-relaxed text-[#c9c0ae]">
          Packets leave only after a candidate approves. Invite is staff-only.
        </p>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#d7ddd8] bg-[var(--paper)]/92 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="rounded-xl border border-border px-3 py-2 text-sm lg:hidden"
            onClick={() => setNavOpen((v) => !v)}
          >
            Menu
          </button>
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-full border-[#d7ddd8] bg-white pl-10"
              placeholder={
                view === 'people'
                  ? 'Find a person'
                  : view === 'invite'
                    ? 'Find a company to invite'
                    : 'Find listings, people, or companies'
              }
              value={view === 'people' ? peopleQuery : query}
              onChange={(e) => (view === 'people' ? setPeopleQuery(e.target.value) : setQuery(e.target.value))}
            />
          </label>
          <span className="hidden items-center gap-2 rounded-full border border-[#d7ddd8] bg-white px-2 py-1 sm:flex">
            <span className="grid size-8 place-items-center rounded-full bg-[var(--forest)] font-serif text-sm text-[var(--paper)]">
              {initials(name)}
            </span>
            <span className="pr-2">
              <span className="block text-sm leading-tight">{first}</span>
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">
                {superAdmin ? 'Super admin' : 'Admin'}
              </span>
            </span>
          </span>
          <Button variant="outline" type="button" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>

        {navOpen ? (
          <div className="flex gap-1 overflow-x-auto border-b border-border bg-[var(--forest)] px-3 py-2 lg:hidden">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${view === item.id ? 'bg-[#c6a15b] text-[var(--forest)]' : 'text-[#e7e1d4]'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <main className="space-y-5 px-4 py-6 sm:px-6">
          {dash.isError ? (
            <Card className="text-sm text-[var(--copper)]">
              {dash.error instanceof Error ? dash.error.message : 'Could not load the staff atelier.'}
            </Card>
          ) : null}

          {view === 'pulse' ? (
            <>
              <div className="atelier-enter flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--copper)]">Studio pulse</p>
                  <h1 className="mt-1 font-serif text-3xl sm:text-4xl">
                    {greeting()}, {first}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">Live matching desk — not a marketplace clone.</p>
                </div>
                <span className="rounded-full border border-[#c6a15b55] bg-[#f7f1e4] px-3 py-1.5 text-xs font-medium text-[var(--forest)]">
                  Live now
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PulseTile delay="atelier-enter-2" icon={Users} label="People in studio" value={counts?.people ?? '—'} hint={`${counts?.candidates ?? 0} candidates`} />
                <PulseTile delay="atelier-enter-3" icon={ScrollText} label="Scored listings" value={counts?.jobs ?? '—'} hint="Across authorized boards" />
                <PulseTile delay="atelier-enter-4" icon={Mail} label="Invite queue" value={counts?.companiesToInvite ?? '—'} hint="Staff send these links" gold />
                <PulseTile delay="atelier-enter-5" icon={Building2} label="Approved packets" value={counts?.packets ?? '—'} hint={`${counts?.employers ?? 0} hiring desks`} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)]">
                <Card className="atelier-enter-3 min-w-0">
                  <h2>Board weather</h2>
                  <p className="mt-3 text-sm text-muted-foreground">Where scored listings sit right now — gold for volume, copper for the lead board.</p>
                  <BoardWeather boards={data?.boards ?? []} />
                </Card>
                <Card className="atelier-enter-4">
                  <h2>Role ribbon</h2>
                  <p className="mt-3 text-sm text-muted-foreground">A mix, not a pie. Forest candidates, copper employers, gold staff.</p>
                  <RoleRibbon
                    candidates={counts?.candidates ?? 0}
                    employers={counts?.employers ?? 0}
                    admins={counts?.admins ?? 0}
                  />
                </Card>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)_18rem]">
                <Card className="atelier-enter-3 overflow-x-auto">
                  <div className="flex items-center justify-between gap-3">
                    <h2>Fresh listings</h2>
                    <button type="button" className="text-sm text-[var(--copper)]" onClick={() => go('listings')}>
                      Open all
                    </button>
                  </div>
                  <table className="mt-5 w-full min-w-[28rem] text-left text-sm">
                    <thead className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        <th className="pb-2 font-medium">Role</th>
                        <th className="pb-2 font-medium">Company</th>
                        <th className="pb-2 font-medium">Board</th>
                        <th className="pb-2 font-medium">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.listings ?? []).slice(0, 5).map((row) => (
                        <tr key={row.id} className="border-t border-[#e6ebe7]">
                          <td className="py-3 font-medium">{row.title}</td>
                          <td className="py-3 text-muted-foreground">{row.company}</td>
                          <td className="py-3">{sourceLabel(row.source)}</td>
                          <td className="py-3">{row.atelier ? 'Atelier' : row.remote ? 'Remote' : 'On-site'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card className="atelier-enter-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2>Invite queue</h2>
                    <button type="button" className="text-sm text-[var(--copper)]" onClick={() => go('invite')}>
                      Write one
                    </button>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {(data?.invites ?? []).slice(0, 5).map((row) => (
                      <li key={row.company}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-2xl bg-[#f6f8f6] px-3 py-2.5 text-left hover:bg-[#eef3f0]"
                          onClick={() => {
                            setPicked(row.company)
                            go('invite')
                          }}
                        >
                          <span>
                            <span className="block font-medium">{row.company}</span>
                            <span className="text-xs text-muted-foreground">{row.listings} listings</span>
                          </span>
                          <Mail className="size-4 text-[var(--copper)]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>

                <div className="space-y-5">
                  <Card className="atelier-enter-5 bg-[#f7f1e4]">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--copper)]">Next moves</p>
                    <div className="mt-4 space-y-2">
                      <Button variant="copper" className="w-full justify-between" onClick={() => go('invite')}>
                        Invite a company
                        <Mail className="size-4" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between" onClick={() => go('people')}>
                        Review people
                        <Users className="size-4" />
                      </Button>
                    </div>
                  </Card>
                  <Card>
                    <h2>Studio log</h2>
                    <ul className="mt-4 space-y-3">
                      {(data?.activity ?? []).slice(0, 5).map((row, i) => (
                        <li key={`${row.title}-${i}`} className="flex gap-3 text-sm">
                          <span
                            className={`mt-0.5 size-2 shrink-0 rounded-full ${row.kind === 'invite' ? 'bg-[var(--copper)]' : 'bg-[#c6a15b]'}`}
                          />
                          <span>
                            <span className="block font-medium">{row.title}</span>
                            <span className="text-xs text-muted-foreground">{row.body}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            </>
          ) : null}

          {view === 'invite' ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
              <Card className="atelier-enter min-w-0">
                <h2>Companies to invite</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {invites.length} of {data?.invites.length ?? 0} off-platform employers
                </p>
                {sources.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <FilterChip active={source === 'all'} onClick={() => setSource('all')} label="All boards" />
                    {sources.map((s) => (
                      <FilterChip key={s} active={source === s} onClick={() => setSource(s)} label={sourceLabel(s)} />
                    ))}
                  </div>
                ) : null}
                <div className="mt-5 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                  {dash.isLoading
                    ? [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/70" />)
                    : invites.map((row) => {
                        const active = selected?.company === row.company
                        return (
                          <button
                            key={row.company}
                            type="button"
                            onClick={() => setPicked(row.company)}
                            className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                              active
                                ? 'border-[var(--forest)] bg-[#f4f8f5] shadow-[0_8px_20px_rgba(19,38,31,0.06)]'
                                : 'border-transparent bg-[#f6f8f6] hover:border-[var(--forest)]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-serif text-lg leading-tight">{row.company}</p>
                              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[0.68rem] tabular-nums text-muted-foreground">
                                {row.listings}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{row.title}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {row.sources.map((s) => (
                                <span key={s} className="rounded-full border border-[#d7ddd8] px-2 py-0.5 text-[0.65rem] text-[var(--forest)]">
                                  {sourceLabel(s)}
                                </span>
                              ))}
                            </div>
                          </button>
                        )
                      })}
                  {!dash.isLoading && !invites.length ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No companies match that search.</p>
                  ) : null}
                </div>
              </Card>
              <aside className="lg:sticky lg:top-24">
                <section className="atelier-enter-3 overflow-hidden rounded-[1.75rem] border border-[#c9c0ae22] bg-[var(--forest)] p-6 text-[var(--paper)] shadow-[0_16px_40px_rgba(13,27,22,0.14)] sm:p-7">
                  {selected ? (
                    <InviteEmployer
                      tone="studio"
                      job={{ title: selected.title, company: selected.company, source: selected.source }}
                    />
                  ) : (
                    <p className="text-sm text-[#d8d0c0]">Pick a company to write their invite.</p>
                  )}
                </section>
              </aside>
            </div>
          ) : null}

          {view === 'people' ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <Card className="atelier-enter">
                <h2>People on Atelier</h2>
                <p className="mt-3 text-sm text-muted-foreground">Signup cannot grant staff. Roles live on the profile.</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(['all', 'admin', 'super_admin', 'employer', 'candidate'] as const).map((role) => (
                    <FilterChip
                      key={role}
                      active={peopleRole === role}
                      onClick={() => setPeopleRole(role)}
                      label={role === 'all' ? 'All' : role.replace('_', ' ')}
                    />
                  ))}
                </div>
                <div className="mt-5 divide-y divide-[#e6ebe7]">
                  {people.map((row) => (
                    <div key={row.id} className="flex items-center gap-3 py-3.5">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e8efe8] font-serif text-sm text-[var(--forest)]">
                        {initials(row.name || row.email)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {row.email}
                          {row.companyName ? ` · ${row.companyName}` : ''}
                        </p>
                      </div>
                      <RolePill role={row.role} />
                    </div>
                  ))}
                  {!dash.isLoading && !people.length ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No accounts in this view.</p>
                  ) : null}
                </div>
              </Card>
              {superAdmin ? (
                <Card className="atelier-enter-3 h-fit">
                  <h2>Change a role</h2>
                  <form className="mt-5 space-y-3" onSubmit={onPromote}>
                    <Input type="email" required placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <select
                      className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm"
                      value={nextRole}
                      onChange={(e) => setNextRole(e.target.value as typeof nextRole)}
                    >
                      <option value="admin">admin</option>
                      <option value="employer">employer</option>
                      <option value="candidate">candidate</option>
                    </select>
                    {promote.isError ? (
                      <p className="text-sm text-[var(--copper)]">
                        {promote.error instanceof Error ? promote.error.message : 'Could not update role.'}
                      </p>
                    ) : null}
                    <Button variant="copper" type="submit" disabled={promote.isPending}>
                      {promote.isPending ? 'Saving…' : 'Update role'}
                    </Button>
                  </form>
                </Card>
              ) : null}
            </div>
          ) : null}

          {view === 'listings' ? (
            <Card className="atelier-enter overflow-x-auto">
              <h2>Scored listings</h2>
              <p className="mt-3 text-sm text-muted-foreground">Authorized boards and Atelier posts currently in memory or the jobs table.</p>
              <table className="mt-5 w-full min-w-[36rem] text-left text-sm">
                <thead className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Company</th>
                    <th className="pb-2 font-medium">Board</th>
                    <th className="pb-2 font-medium">Posted</th>
                    <th className="pb-2 font-medium">Desk</th>
                  </tr>
                </thead>
                <tbody>
                  {searchListings.map((row) => (
                    <tr key={row.id} className="border-t border-[#e6ebe7]">
                      <td className="py-3 font-medium">{row.title}</td>
                      <td className="py-3 text-muted-foreground">{row.company}</td>
                      <td className="py-3">{sourceLabel(row.source)}</td>
                      <td className="py-3 tabular-nums">{row.postedAt || '—'}</td>
                      <td className="py-3">{row.atelier ? 'Atelier inbox' : 'Invite if needed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}

          {view === 'keys' ? (
            <Card className="atelier-enter max-w-xl">
              <h2>Promote in SQL</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Staff cannot come from public signup. Set role to admin in Supabase when someone should open this desk.
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-[var(--copper)]">Show statement</summary>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-[var(--forest)] p-4 text-xs leading-relaxed text-[#e7e1d4]">
                  {sql}
                </pre>
                <Button variant="outline" className="mt-3" type="button" onClick={copySql}>
                  {copied ? 'Copied' : 'Copy SQL'}
                </Button>
              </details>
            </Card>
          ) : null}
        </main>
      </div>
    </div>
  )
}

function PulseTile({
  icon: Icon,
  label,
  value,
  hint,
  gold,
  delay,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  hint: string
  gold?: boolean
  delay: string
}) {
  return (
    <Card className={`${delay} flex items-start gap-3`}>
      <span className={`grid size-11 place-items-center rounded-2xl ${gold ? 'bg-[#f7f1e4] text-[var(--copper)]' : 'bg-[#e8efe8] text-[var(--forest)]'}`}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className={`mt-1 font-serif text-3xl tabular-nums leading-none ${gold ? 'text-[var(--copper)]' : ''}`}>{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      </div>
    </Card>
  )
}

function BoardWeather({ boards }: { boards: { source: string; count: number }[] }) {
  const top = boards.slice(0, 7)
  const max = Math.max(1, ...top.map((b) => b.count))
  const w = 560
  const h = 168
  const pad = 18
  const points = top.map((b, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, top.length - 1)
    const y = h - pad - (b.count / max) * (h - pad * 2)
    return `${x},${y}`
  })
  const line = points.join(' ')
  const area = top.length ? `${pad},${h - pad} ${line} ${w - pad},${h - pad}` : ''
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full overflow-visible" role="img" aria-label="Listings by board">
        <defs>
          <linearGradient id="atelierWeather" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c6a15b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#c6a15b" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {area ? <polygon className="atelier-fill" points={area} fill="url(#atelierWeather)" /> : null}
        {line ? (
          <polyline
            className="atelier-draw"
            points={line}
            fill="none"
            stroke="#b85c38"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-[0.7rem] text-muted-foreground">
        {top.map((b) => (
          <span key={b.source}>
            {sourceLabel(b.source)} · {b.count}
          </span>
        ))}
      </div>
    </div>
  )
}

function RoleRibbon({ candidates, employers, admins }: { candidates: number; employers: number; admins: number }) {
  const total = Math.max(1, candidates + employers + admins)
  const rows = [
    { label: 'Candidates', n: candidates, className: 'bg-[var(--forest)]', delay: '0s' },
    { label: 'Employers', n: employers, className: 'bg-[var(--copper)]', delay: '0.12s' },
    { label: 'Staff', n: admins, className: 'bg-[#c6a15b]', delay: '0.24s' },
  ]
  return (
    <div className="mt-5 space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full">
        {rows.map((row) => (
          <span
            key={row.label}
            className={`atelier-bar h-full ${row.className}`}
            style={{ width: `${(row.n / total) * 100}%`, animationDelay: row.delay }}
          />
        ))}
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${row.className}`} />
              {row.label}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {row.n} · {Math.round((row.n / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs capitalize ${
        active ? 'bg-[var(--forest)] text-[var(--paper)]' : 'border border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

function RolePill({ role }: { role: AccountRole }) {
  const tone =
    role === 'admin' || role === 'super_admin'
      ? 'border-[#c6a15b66] bg-[#f7f1e4] text-[var(--copper)]'
      : role === 'employer'
        ? 'border-[#1f3d3233] bg-[#e8efe8] text-[var(--forest)]'
        : 'border-border text-muted-foreground'
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {role.replace('_', ' ')}
    </span>
  )
}
