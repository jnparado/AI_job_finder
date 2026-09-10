import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BrandMark } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InviteEmployer } from '@/components/jobs/InviteEmployer'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
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

export function AdminPage() {
  const { profile, signOut } = useAuth()
  const qc = useQueryClient()
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
      <header className="bg-[var(--forest)] px-5 py-4 text-[var(--paper)] sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <BrandMark light />
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-[#c6a15b66] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#c6a15b] sm:inline">
              {superAdmin ? 'Super admin' : 'Admin'}
            </span>
            <Button
              variant="outline"
              type="button"
              className="rounded-xl border-white/20 bg-white/5 text-[var(--paper)] hover:bg-white/10"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
        <section className="overflow-hidden rounded-3xl border border-[#c9c0ae22] bg-[var(--forest)] text-[var(--paper)] shadow-[0_16px_40px_rgba(13,27,22,0.12)]">
          <div className="p-6 sm:p-8">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Staff desk</p>
            <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">{data?.name || profile.email}</h1>
            <p className="mt-2 text-sm text-[#d8d0c0]">
              Role lives on <code className="text-[#c6a15b]">public.profiles.role</code>. Only admin can invite
              employers. Candidates apply on the official listing.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#c9c0ae22] sm:grid-cols-5">
            <AdminStat n={data?.counts.candidates ?? '—'} label="Candidates" />
            <AdminStat n={data?.counts.employers ?? '—'} label="Employers" />
            <AdminStat n={data?.counts.admins ?? '—'} label="Admins" />
            <AdminStat n={data?.counts.jobs ?? '—'} label="Jobs" />
            <AdminStat n={data?.counts.companiesToInvite ?? '—'} label="To invite" />
          </div>
        </section>

        {dash.isError ? (
          <Card className="text-sm text-[var(--copper)]">
            {dash.error instanceof Error ? dash.error.message : 'Could not load the admin desk.'}
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <h2>Invite employers</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Off-platform listings (Himalayas, career pages, LinkedIn, and others). Copy a join link and send it to
              the company. They create a hiring account on Atelier.
            </p>
            <div className="mt-5 space-y-2">
              {(data?.invites ?? []).slice(0, 40).map((row) => {
                const active = (picked || data?.invites[0]?.company) === row.company
                return (
                  <button
                    key={row.company}
                    type="button"
                    onClick={() => setPicked(row.company)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      active ? 'border-[var(--forest)] bg-[#f4f8f5]' : 'border-[#e6ebe7] bg-[#f8faf8] hover:border-[var(--forest)]'
                    }`}
                  >
                    <p className="font-serif text-lg leading-tight">{row.company}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.title} · {row.listings} listing{row.listings === 1 ? '' : 's'} ·{' '}
                      {row.sources.map(sourceLabel).join(', ')}
                    </p>
                  </button>
                )
              })}
              {!dash.isLoading && !data?.invites.length ? (
                <p className="text-sm text-muted-foreground">No off-platform companies to invite yet.</p>
              ) : null}
            </div>
            {(() => {
              const row = data?.invites.find((item) => item.company === (picked || data.invites[0]?.company))
              return row ? (
                <div className="mt-4">
                  <InviteEmployer job={{ title: row.title, company: row.company, source: row.source }} />
                </div>
              ) : null
            })()}
          </Card>

          <div className="space-y-6">
            <Card>
              <h2>Make someone admin</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Staff roles cannot come from signup. Set <code>role = 'admin'</code> on <code>public.profiles</code> in
                the Supabase SQL editor.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-[var(--forest)] p-4 text-xs leading-relaxed text-[#e7e1d4]">
                {sql}
              </pre>
              <Button variant="outline" className="mt-3" type="button" onClick={copySql}>
                {copied ? 'Copied' : 'Copy SQL'}
              </Button>
              {superAdmin ? (
                <form className="mt-6 space-y-3 border-t border-[#e6ebe7] pt-5" onSubmit={onPromote}>
                  <p className="text-sm font-medium">Or promote from this desk</p>
                  <Input
                    type="email"
                    required
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
              ) : null}
            </Card>

            <Card>
              <h2>Accounts</h2>
              <div className="mt-4 divide-y divide-[#e6ebe7]">
                {(data?.accounts ?? []).map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.email}
                        {row.companyName ? ` · ${row.companyName}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${
                        row.role === 'admin' || row.role === 'super_admin'
                          ? 'border-[#c6a15b66] text-[var(--copper)]'
                          : row.role === 'employer'
                            ? 'border-[var(--forest)] text-[var(--forest)]'
                            : 'border-border text-muted-foreground'
                      }`}
                    >
                      {row.role}
                    </span>
                  </div>
                ))}
                {!dash.isLoading && !data?.accounts.length ? (
                  <p className="py-3 text-sm text-muted-foreground">
                    No profiles loaded. Confirm <code>public.profiles.role</code> exists and this account is{' '}
                    <code>admin</code>.
                  </p>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

function AdminStat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="bg-[var(--forest-2)] px-4 py-4 text-[var(--paper)]">
      <div className="font-serif text-2xl tabular-nums sm:text-3xl">{n}</div>
      <div className="mt-1 text-xs text-[#c9c0ae] sm:text-sm">{label}</div>
    </div>
  )
}
