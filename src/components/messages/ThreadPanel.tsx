import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import type { MessageThreadPayload } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, initials } from '@/lib/utils'
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

export function ThreadPanel({
  applicationId,
  variant = 'card',
}: {
  applicationId: string
  variant?: 'card' | 'pane'
}) {
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
  const pane = variant === 'pane'

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
    return pane ? (
      <p className="p-6 text-sm text-muted-foreground">Could not load messages.</p>
    ) : (
      <Card id="messages">
        <p className="text-sm text-muted-foreground">Could not load messages.</p>
      </Card>
    )
  }

  if (!data) {
    return pane ? (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-10 w-40 animate-pulse rounded-full bg-muted" />
      </div>
    ) : (
      <Card id="messages" className="h-48 animate-pulse bg-muted/60" />
    )
  }

  const bubbles = (
    <>
      <div className={cn('space-y-2 overflow-y-auto', pane ? 'min-h-0 flex-1 px-4 py-4' : 'max-h-[min(28rem,50vh)] px-4 sm:px-5')}>
        {messages.length ? (
          messages.map((m) => {
            const mine = m.senderId === me || m.senderRole === data.viewerRole
            const name = mine ? 'You' : data.otherName
            return (
              <div key={m.id} className={cn('flex gap-2', mine ? 'flex-row-reverse' : '')}>
                {pane && !mine ? (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-[#e8efe8] font-serif text-[0.65rem] text-[var(--forest)]">
                    {initials(name)}
                  </span>
                ) : pane ? (
                  <span className="size-7 shrink-0" />
                ) : (
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full font-serif text-xs',
                      mine ? 'bg-[var(--forest)] text-[var(--paper)]' : 'bg-muted',
                    )}
                  >
                    {initials(name)}
                  </span>
                )}
                <div className={cn('max-w-[min(100%,22rem)] break-words sm:max-w-[28rem]', mine ? 'text-right' : '')}>
                  <div
                    className={cn(
                      'px-3.5 py-2 text-sm leading-relaxed',
                      mine
                        ? 'rounded-[1.15rem] rounded-br-md bg-[var(--forest)] text-[var(--paper)]'
                        : 'rounded-[1.15rem] rounded-bl-md bg-[#e8efe8] text-[var(--forest)]',
                    )}
                  >
                    {m.body}
                  </div>
                  <p className="mt-1 px-1 text-[0.65rem] text-muted-foreground">{formatWhen(m.createdAt)}</p>
                </div>
              </div>
            )
          })
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {data.canMessage
              ? `Say hello to ${data.otherName}. They will see it in Atelier.`
              : data.closedReason}
          </p>
        )}
        <div ref={endRef} />
      </div>
      <form
        className={cn('border-t border-border', pane ? 'bg-white px-3 py-3' : 'px-4 py-4 sm:px-5')}
        onSubmit={onSubmit}
      >
        {data.canMessage ? (
          pane ? (
            <div className="flex items-end gap-2">
              <textarea
                className="max-h-32 min-h-10 flex-1 resize-none rounded-[1.35rem] border border-border bg-[#f4f6f4] px-4 py-2.5 text-sm outline-none focus:border-[var(--forest)]"
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={4000}
                placeholder="Write a message…"
                aria-label="Message"
              />
              <button
                type="submit"
                disabled={!draft.trim() || send.isPending}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--forest)] text-[var(--paper)] disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </div>
          ) : (
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
            </>
          )
        ) : (
          <p className="px-1 py-1 text-sm text-muted-foreground">{data.closedReason}</p>
        )}
        {send.isError ? (
          <p className="mt-2 text-sm text-[#8f4326]">{(send.error as Error).message}</p>
        ) : null}
      </form>
    </>
  )

  if (pane) {
    return (
      <div id="messages" className="flex min-h-0 flex-1 flex-col bg-[#f7f8f7]">
        {bubbles}
      </div>
    )
  }

  return (
    <Card id="messages" className="flex flex-col gap-4 overflow-hidden p-0">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="eyebrow">Messages</p>
        <h2 className="mt-1 text-xl break-words sm:text-2xl">Chat with {data.otherName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.jobTitle} · {data.company}
        </p>
      </div>
      {bubbles}
    </Card>
  )
}
