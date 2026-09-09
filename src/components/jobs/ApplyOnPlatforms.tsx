import { ExternalLink } from 'lucide-react'
import { isAtelierJob, listingUrl, officialApplyLinks } from '@shared/applyBoards'
import { sourceLabel } from '@shared/types'
import { Button } from '@/components/ui/button'

export function ApplyOnPlatforms({
  job,
  compact = false,
  boardsOnly = false,
}: {
  job: {
    title: string
    company: string
    source: string
    applicationUrl?: string
    employerId?: string | null
  }
  compact?: boolean
  boardsOnly?: boolean
}) {
  if (isAtelierJob(job)) return null
  const listing = listingUrl(job)
  const boards = officialApplyLinks(job)
  const platform = sourceLabel(job.source)

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {compact ? null : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Atelier drafts the resume and letter. You submit them on the official page. We never click Apply on
          LinkedIn, Indeed, Upwork, or similar boards.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {listing && !boardsOnly ? (
          <Button variant="copper" size={compact ? 'sm' : 'default'} asChild>
            <a href={listing} target="_blank" rel="noreferrer">
              Apply on {platform}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ) : null}
        {boards
          .filter((board) => board.source !== job.source)
          .map((board) => (
            <Button key={board.source} variant="outline" size={compact ? 'sm' : 'default'} asChild>
              <a href={board.url} target="_blank" rel="noreferrer">
                {board.label}
                <ExternalLink className="size-3.5 opacity-70" />
              </a>
            </Button>
          ))}
      </div>
    </div>
  )
}
