import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Search, Users } from 'lucide-react'
import { BrandMark } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InviteEmployer } from '@/components/jobs/InviteEmployer'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { greeting, initials } from '@/lib/utils'
import { sourceLabel, type AccountRole } from '@shared/types'

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
  }
  accounts: AdminAccount[]
  invites: AdminInvite[]
  promoteSql: string
}

type DeskTab = 'invite' | 'people'

export function AdminPage() {
  const { profile, signOut } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<DeskTab>('invite')
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
    const q = peopleQuery.trim().toLowerCase()
    return (data?.accounts ?? []).filter((row) => {
      if (peopleRole !== 'all' && row.role !== peopleRole) return false
      if (!q) return true
      return `${row.name} ${row.email} ${row.companyName}`.toLowerCase().includes(q)
    })
  }, [data?.accounts, peopleQuery, peopleRole])

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

  return (
    <div className="atelier-app min-h-svh">
      <header className="sticky top-0 z-40 border-b border-[#c9c0ae22] bg-[var(--forest)] text-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <BrandMark light compact />
          <nav className="mx-auto flex items-center gap-1 rounded-full bg-[#0d1b16] p-1">
            <TabButton active={tab === 'invite'} onClick={() => setTab('invite')} icon={Building2} label="Invite" count={data?.counts.companiesToInvite} />
            <TabButton active={tab === 'people'} onClick={() => setTab('people')} icon={Users} label="People" count={data?.accounts.length} />
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-2xl border border-[#c9c0ae44] bg-[#1a332b] px-2.5 py-1.5 sm:block">
              <span className="block text-sm leading-tight">{first}</span>
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#c6a15b]">
                {superAdmin ? 'Super admin' : 'Admin'}
              </span>
            </span>
            <Button
              variant="outline"
              type="button"
              className="border-white/20 bg-white/5 text-[var(--paper)] hover:bg-white/10"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        <section className="overflow-hidden rounded-[1.75rem] border border-[#c9c0ae22] bg-[var(--forest)] text-[var(--paper)] shadow-[0_18px_48px_rgba(13,27,22,0.16)]">
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-8 -top-10 size-48 rounded-full bg-[#c6a15b22] blur-3xl" />
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#c6a15b]">Atelier staff</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
              {greeting()}, {first}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#d8d0c0] sm:text-base">
              Invite companies from other boards to hire on Atelier. Candidates never send those links — that stays
              with you.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#c9c0ae22] sm:grid-cols-5">
            <AdminStat n={data?.counts.candidates ?? '—'} label="Candidates" />
            <AdminStat n={data?.counts.employers ?? '—'} label="Employers" />
            <AdminStat n={data?.counts.admins ?? '—'} label="Admins" gold />
            <AdminStat n={data?.counts.jobs ?? '—'} label="Jobs scored" />
            <AdminStat n={data?.counts.companiesToInvite ?? '—'} label="To invite" gold />
          </div>
        </section>

        {dash.isError ? (
          <Card className="text-sm text-[var(--copper)]">
            {dash.error instanceof Error ? dash.error.message : 'Could not load the admin desk.'}
          </Card>
        ) : null}

        {tab === 'invite' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
            <Card className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2>Companies to invite</h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {invites.length} of {data?.invites.length ?? 0} off-platform employers
                  </p>
                </div>
              </div>
              <label className="relative mt-5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="rounded-full pl-10"
                  placeholder="Search company or role"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {sources.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
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
              <section className="overflow-hidden rounded-[1.75rem] border border-[#c9c0ae22] bg-[var(--forest)] p-6 text-[var(--paper)] shadow-[0_16px_40px_rgba(13,27,22,0.14)] sm:p-7">
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
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card>
              <h2>People on Atelier</h2>
              <p className="mt-3 text-sm text-muted-foreground">Roles come from public.profiles. Signup cannot grant staff.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="rounded-full pl-10"
                    placeholder="Search name or email"
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
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

            <div className="space-y-6">
              {superAdmin ? (
                <Card>
                  <h2>Change a role</h2>
                  <p className="mt-3 text-sm text-muted-foreground">Super admin only. Use this for accounts that already exist.</p>
                  <form className="mt-5 space-y-3" onSubmit={onPromote}>
                    <Input
                      type="email"
                      required
                      placeholder="email@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
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
              <Card>
                <h2>Promote in SQL</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Run this in the Supabase SQL editor when someone should become staff.
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
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Building2
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
        active ? 'bg-[#1f3d32] text-white' : 'text-[#c9c0ae] hover:text-white'
      }`}
    >
      <Icon className="size-4" />
      {label}
      {count != null ? <span className="tabular-nums text-[#c6a15b]">{count}</span> : null}
    </button>
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

function AdminStat({ n, label, gold }: { n: number | string; label: string; gold?: boolean }) {
  return (
    <div className="bg-[var(--forest-2)] px-4 py-5 text-[var(--paper)]">
      <div className={`font-serif text-3xl tabular-nums sm:text-4xl ${gold ? 'text-[#c6a15b]' : ''}`}>{n}</div>
      <div className="mt-1 text-xs text-[#c9c0ae] sm:text-sm">{label}</div>
    </div>
  )
}
