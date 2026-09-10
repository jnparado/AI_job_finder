import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MessageThreadPayload } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { initials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Textarea } from '@/components/ui/card'

function formatWhen(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 45_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))}h ago`
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function ThreadPanel({ applicationId }: { applicationId: string }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const thread = useQuery({
    queryKey: ['thread', applicationId],
    queryFn: () => api<MessageThreadPayload>(`/api/applications/${applicationId}/messages`),
    enabled: Boolean(applicationId),
    refetchInterval: 8000,
  })
  const send = useMutation({
    mutationFn: (body: string) =>
      api<MessageThreadPayload>(`/api/applications/${applicationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: (data) => {
      setDraft('')
      qc.setQueryData(['thread', applicationId], data)
      void qc.invalidateQueries({ queryKey: ['message-threads'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const data = thread.data
  const me = profile.id
  const messages = data?.messages ?? []

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, applicationId])

  function onSubmit(e?: FormEvent) {
    e?.preventDefault()
    const body = draft.trim()
    if (!body || send.isPending || !data?.canMessage) return
    send.mutate(body)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  if (thread.isError) {
    return (
      <Card id="messages">
        <p className="text-sm text-muted-foreground">Could not load messages.</p>
      </Card>
    )
  }

  if (!data) {
    return <Card id="messages" className="h-48 animate-pulse bg-muted/60" />
  }

  return (
    <Card id="messages" className="flex flex-col gap-4 p-0 overflow-hidden">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="eyebrow">Messages</p>
        <h2 className="mt-1 text-xl break-words sm:text-2xl">Chat with {data.otherName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.jobTitle} · {data.company}
        </p>
      </div>
      <div className="max-h-[min(28rem,50vh)] space-y-3 overflow-y-auto px-4 sm:px-5">
        {messages.length ? (
          messages.map((m) => {
            const mine = m.senderId === me || m.senderRole === data.viewerRole
            const name = mine ? 'You' : data.otherName
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full font-serif text-xs ${
                    mine ? 'bg-[var(--forest)] text-[var(--paper)]' : 'bg-muted'
                  }`}
                >
                  {initials(name)}
                </span>
                <div className={`max-w-[min(100%,28rem)] break-words ${mine ? 'text-right' : ''}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      mine ? 'bg-[var(--forest)] text-[var(--paper)]' : 'bg-muted'
                    }`}
                  >
                    {m.body}
                  </div>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">{formatWhen(m.createdAt)}</p>
                </div>
              </div>
            )
          })
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            {data.canMessage
              ? 'No messages yet. Say hello — they will see it in Atelier.'
              : data.closedReason}
          </p>
        )}
        <div ref={endRef} />
      </div>
      <form className="border-t border-border px-4 py-4 sm:px-5" onSubmit={onSubmit}>
        {data.canMessage ? (
          <>
            <Textarea
              className="min-h-24"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={4000}
              placeholder={`Message ${data.otherName}…`}
              aria-label="Message"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
              <Button variant="copper" type="submit" disabled={!draft.trim() || send.isPending}>
                {send.isPending ? 'Sending…' : 'Send'}
              </Button>
            </div>
            {send.isError ? (
              <p className="mt-2 text-sm text-[#8f4326]">{(send.error as Error).message}</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{data.closedReason}</p>
        )}
      </form>
    </Card>
  )
}
