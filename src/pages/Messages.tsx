import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import type { MessageThreadPayload, MessageThreadSummary } from '@shared/types'
import { api } from '@/lib/api'
import { ThreadPanel } from '@/components/messages/ThreadPanel'
import { Badge, Card } from '@/components/ui/card'
import { EmptyState, PageHeader } from '@/components/ui/feedback'

export function CandidateMessagesPage() {
  return <MessagesList role="candidate" />
}

export function EmployerMessagesPage() {
  return <MessagesList role="employer" />
}

export function CandidateThreadPage() {
  return <MessageThread role="candidate" />
}

export function EmployerThreadPage() {
  return <MessageThread role="employer" />
}

function MessagesList({ role }: { role: 'candidate' | 'employer' }) {
  const q = useQuery({
    queryKey: ['message-threads', role],
    queryFn: () => api<MessageThreadSummary[]>('/api/messages'),
    refetchInterval: 15000,
  })
  const list = q.data ?? []
  const applicationsHref = role === 'employer' ? '/employer/inbox' : '/app/applications'
  const kicker = role === 'employer' ? 'Hiring' : 'Apply'

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={kicker}
        title="Messages"
        description={
          role === 'employer'
            ? 'Write to candidates who sent a packet to your Atelier listing. They can reply here.'
            : 'Message Atelier employers after you send a packet. LinkedIn, Indeed, and Upwork chats stay on those sites.'
        }
      />
      {list.length ? (
        <div className="space-y-3">
          {list.map((t) => (
            <Link key={t.applicationId} to={t.href} className="block">
              <Card className="flex flex-wrap items-start justify-between gap-3 hover:border-primary">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl">{t.otherName}</h2>
                    {t.unreadCount ? <Badge tone="copper">{t.unreadCount} new</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.jobTitle} · {t.company}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm">
                    {t.lastBody || 'No messages yet — start the conversation.'}
                  </p>
                </div>
                <span className="text-sm text-[var(--copper)]">Open chat</span>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No conversations yet"
          body={
            role === 'employer'
              ? 'When a candidate sends a packet to one of your roles, you can message them here.'
              : 'Send a packet to an Atelier employer first. Then you can message each other in the workshop.'
          }
          actionLabel={role === 'employer' ? 'Open inbox' : 'Applications'}
          to={applicationsHref}
        />
      )}
    </div>
  )
}

function MessageThread({ role }: { role: 'candidate' | 'employer' }) {
  const { id } = useParams()
  const back = role === 'employer' ? '/employer/messages' : '/app/messages'
  const meta = useQuery({
    queryKey: ['thread', id],
    queryFn: () => api<MessageThreadPayload>(`/api/applications/${id}/messages`),
    enabled: Boolean(id),
  })

  if (!id) return null

  return (
    <div className="space-y-6">
      <Link to={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All messages
      </Link>
      {meta.data ? (
        <div>
          <h1 className="text-2xl break-words sm:text-3xl">{meta.data.otherName}</h1>
          <p className="mt-1 text-muted-foreground">
            {meta.data.jobTitle} · {meta.data.company}
          </p>
          <Link to={meta.data.packetHref} className="mt-2 inline-block text-sm text-[var(--copper)]">
            {role === 'employer' ? 'Review packet' : 'Open application packet'}
          </Link>
        </div>
      ) : (
        <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
      )}
      <ThreadPanel applicationId={id} />
    </div>
  )
}
