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
}: {
  job: {
    title: string
    company: string
    source: string
    employerId?: string | null
  }
  compact?: boolean
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
