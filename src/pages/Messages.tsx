import { useMemo, useState } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText, MessagesSquare, Search } from 'lucide-react'
import type { MessageThreadSummary } from '@shared/types'
import { api } from '@/lib/api'
import { ThreadPanel } from '@/components/messages/ThreadPanel'
import { cn, initials } from '@/lib/utils'

export function CandidateMessagesPage() {
  return <MessengerDesk role="candidate" />
}

export function EmployerMessagesPage() {
  return <MessengerDesk role="employer" />
}

export function CandidateThreadPage() {
  return <MessengerDesk role="candidate" />
}

export function EmployerThreadPage() {
  return <MessengerDesk role="employer" />
}

function messengerTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 45_000) return 'Now'
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m`
  if (diff < 86_400_000) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (diff < 6 * 86_400_000) return d.toLocaleDateString(undefined, { weekday: 'short' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function MessengerDesk({ role }: { role: 'candidate' | 'employer' }) {
  const { id } = useParams()
  const [query, setQuery] = useState('')
  const listHref = role === 'employer' ? '/employer/messages' : '/app/messages'
  const packetsHref = role === 'employer' ? '/employer/inbox' : '/app/applications'
  const threads = useQuery({
    queryKey: ['message-threads', role],
    queryFn: () => api<MessageThreadSummary[]>('/api/messages'),
    refetchInterval: 15_000,
  })
  const all = threads.data ?? []
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((t) =>
      `${t.otherName} ${t.jobTitle} ${t.company} ${t.lastBody ?? ''}`.toLowerCase().includes(q),
    )
  }, [all, query])
  const selected = all.find((t) => t.applicationId === id)
  const openThread = Boolean(id)

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-white">
      <aside
        className={cn(
          'min-w-0 flex-col border-r border-border bg-white md:w-[22.5rem] md:shrink-0',
          openThread ? 'hidden md:flex' : 'flex w-full',
        )}
      >
        <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-serif text-2xl text-[var(--forest)]">Chats</h1>
            <Link
              to={packetsHref}
              replace
              className="text-xs font-medium text-[var(--copper)] hover:underline"
            >
              Packets
            </Link>
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-full bg-[#f0f2f0] px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {threads.isLoading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/70" />
              ))}
            </div>
          ) : !all.length ? (
            <div className="grid h-full place-items-center px-8 py-16 text-center">
              <MessagesSquare className="size-10 text-[#c6a15b]" />
              <p className="mt-3 text-sm font-medium text-[var(--forest)]">No conversations yet</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {role === 'employer'
                  ? 'When a candidate sends a packet, the chat opens here.'
                  : 'Send a packet to an Atelier employer to start a chat.'}
              </p>
              <Link
                to={packetsHref}
                replace
                className="mt-4 inline-flex h-9 items-center rounded-full bg-[var(--copper)] px-4 text-sm text-[var(--paper)] md:hidden"
              >
                {role === 'employer' ? 'Open inbox' : 'Open packets'}
              </Link>
            </div>
          ) : list.length ? (
            <ul>
              {list.map((t) => (
                <li key={t.applicationId}>
                  <NavLink
                    to={t.href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5',
                        isActive ? 'bg-[#e8efe8]' : 'hover:bg-[#f4f6f4]',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'relative grid size-12 shrink-0 place-items-center rounded-full font-serif text-lg',
                            isActive
                              ? 'bg-[var(--forest)] text-[var(--paper)]'
                              : 'bg-[#dce6e0] text-[var(--forest)]',
                          )}
                        >
                          {initials(t.otherName)}
                          {t.unreadCount ? (
                            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--copper)] px-1 text-[0.6rem] font-semibold leading-4 text-white">
                              {t.unreadCount > 9 ? '9+' : t.unreadCount}
                            </span>
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                'truncate text-sm',
                                t.unreadCount ? 'font-semibold text-[var(--forest)]' : 'font-medium',
                              )}
                            >
                              {t.otherName}
                            </span>
                            <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                              {messengerTime(t.lastAt)}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'mt-0.5 block truncate text-xs',
                              t.unreadCount ? 'font-medium text-[var(--forest)]' : 'text-muted-foreground',
                            )}
                          >
                            {t.lastBody || 'Start the conversation'}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.65rem] text-muted-foreground">
                            {t.jobTitle}
                          </span>
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">No chats match that search.</p>
          )}
        </div>
      </aside>

      <section
        className={cn(
          'min-h-0 min-w-0 flex-1 flex-col bg-[#f7f8f7]',
          openThread ? 'flex' : 'hidden md:flex',
        )}
      >
        {id ? (
          <>
            <header className="flex shrink-0 items-center gap-3 border-b border-border bg-white px-3 py-2.5">
              <Link
                to={listHref}
                replace
                className="grid size-9 place-items-center rounded-full text-[var(--forest)] hover:bg-muted md:hidden"
                aria-label="All chats"
              >
                <ArrowLeft className="size-5" />
              </Link>
              <span className="grid size-10 place-items-center rounded-full bg-[var(--forest)] font-serif text-[var(--paper)]">
                {initials(selected?.otherName || 'Chat')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--forest)]">{selected?.otherName || 'Conversation'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selected ? `${selected.jobTitle} · ${selected.company}` : 'Atelier chat'}
                </p>
              </div>
              {selected ? (
                <Link
                  to={
                    role === 'employer'
                      ? `/employer/inbox/${selected.applicationId}`
                      : `/app/applications/${selected.applicationId}`
                  }
                  className="grid size-9 place-items-center rounded-full text-[var(--forest)] hover:bg-muted"
                  aria-label="Open packet"
                >
                  <FileText className="size-4" />
                </Link>
              ) : null}
            </header>
            <ThreadPanel applicationId={id} variant="pane" />
          </>
        ) : (
          <div className="grid flex-1 place-items-center px-8 text-center">
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e8efe8] text-[var(--forest)]">
                <MessagesSquare className="size-8" />
              </span>
              <h2 className="mt-4 font-serif text-2xl text-[var(--forest)]">Your messages</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {role === 'employer'
                  ? 'Pick a candidate on the left. Chats open after they send a packet to your Atelier listing.'
                  : 'Pick a conversation on the left. Atelier employers appear here after you send a packet.'}
              </p>
              {!all.length ? (
                <Link
                  to={packetsHref}
                  replace
                  className="mt-5 inline-flex h-10 items-center rounded-full bg-[var(--copper)] px-5 text-sm text-[var(--paper)]"
                >
                  {role === 'employer' ? 'Open inbox' : 'Open packets'}
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
