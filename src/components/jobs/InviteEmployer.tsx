import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Mail } from 'lucide-react'
import { isAtelierJob } from '@shared/applyBoards'
import { employerInviteNote, employerJoinPath } from '@shared/employerInvite'
import { sourceLabel } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function InviteEmployer({
  job,
  compact = false,
  tone = 'card',
}: {
  job: {
    title: string
    company: string
    source: string
    employerId?: string | null
  }
  compact?: boolean
  tone?: 'card' | 'studio'
}) {
  const [copied, setCopied] = useState('')
  if (isAtelierJob(job) || !job.company.trim()) return null

  const join = employerJoinPath(job)
  const platform = sourceLabel(job.source)

  function copy(kind: 'link' | 'note') {
    const text = kind === 'link' ? `${window.location.origin}${join}` : employerInviteNote(job)
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(kind)
      window.setTimeout(() => setCopied(''), 2000)
    })
  }

  if (compact) {
    return (
      <Link to={join} className="text-xs font-medium text-[var(--copper)] hover:underline">
        Invite {job.company} to Atelier
      </Link>
    )
  }

  if (tone === 'studio') {
    const href = typeof window !== 'undefined' ? `${window.location.origin}${join}` : join
    return (
      <div className="space-y-5">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Invite ready</p>
          <h2 className="mt-2 font-serif text-2xl leading-tight text-[var(--paper)] sm:text-3xl">Ask {job.company} to hire here</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#d8d0c0]">
            Found on {platform}. They do not have an Atelier inbox yet. Send the join link — they create a hiring
            account, then approved packets land here.
          </p>
        </div>
        <p className="truncate rounded-2xl border border-[#c9c0ae33] bg-[#0d1b16] px-4 py-3 text-xs text-[#c9c0ae]">
          {href}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="copper" asChild>
            <Link to={join} target="_blank" rel="noreferrer">
              <Mail className="size-4" />
              Open invite
            </Link>
          </Button>
          <Button variant="paper" type="button" onClick={() => copy('link')}>
            <Copy className="size-4" />
            {copied === 'link' ? 'Copied' : 'Copy join link'}
          </Button>
          <Button
            variant="outline"
            className="border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]"
            type="button"
            onClick={() => copy('note')}
          >
            <Copy className="size-4" />
            {copied === 'note' ? 'Copied' : 'Copy note'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="space-y-3 rounded-3xl">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--copper)]">
        Invite this employer
      </p>
      <h2>Ask {job.company} to hire on Atelier</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        This listing is on {platform}. They do not have an Atelier inbox yet. Send them a join link so they can
        create a hiring account and receive approved packets here.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="copper" className="rounded-full" asChild>
          <Link to={join}>
            <Mail className="size-4" />
            Open invite
          </Link>
        </Button>
        <Button variant="outline" className="rounded-full" type="button" onClick={() => copy('link')}>
          <Copy className="size-4" />
          {copied === 'link' ? 'Copied' : 'Copy join link'}
        </Button>
        <Button variant="outline" className="rounded-full" type="button" onClick={() => copy('note')}>
          <Copy className="size-4" />
          {copied === 'note' ? 'Copied' : 'Copy invite note'}
        </Button>
      </div>
    </Card>
  )
}
