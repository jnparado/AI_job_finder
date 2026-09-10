import { Link } from 'react-router-dom'
import type { JobMatch } from '@shared/types'
import { categoryLabel, sourceLabel } from '@shared/types'
import { moneyBand } from '@/lib/utils'
import { ScoreBadge } from './ScoreBadge'
import { Badge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InviteEmployer } from '@/components/jobs/InviteEmployer'

export function MatchCard({
  match,
  onApply,
  applying,
}: {
  match: JobMatch
  onApply?: () => void
  applying?: boolean
}) {
  const atelier = match.job.source === 'atelier' || Boolean(match.job.employerId)
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[var(--forest)] sm:flex-row sm:items-center sm:p-5">
      <Link to={`/app/jobs/${match.job.id}`} className="flex min-w-0 flex-1 gap-4">
        <ScoreBadge score={match.score} category={match.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={match.score >= 80 ? 'good' : match.score >= 70 ? 'copper' : 'default'}>
              {categoryLabel(match.category)}
            </Badge>
            {match.job.remote ? <Badge>Remote</Badge> : null}
            {atelier ? <Badge tone="copper">Atelier</Badge> : <Badge>{sourceLabel(match.job.source)}</Badge>}
          </div>
          <h3 className="mt-1.5 font-serif text-xl leading-tight">{match.job.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {match.job.company}
            {match.job.location ? ` · ${match.job.location}` : ''}
            {' · '}
            {moneyBand(match.job.salaryMin, match.job.salaryMax, match.job.currency)}
          </p>
          {match.matchedSkills.length ? (
            <p className="mt-2 truncate text-sm text-foreground/80">
              Fits: {match.matchedSkills.slice(0, 4).join(', ')}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {onApply ? (
          <Button variant="copper" size="sm" disabled={applying} onClick={onApply}>
            {applying ? 'Preparing…' : atelier ? 'Send to employer' : `Apply on ${sourceLabel(match.job.source)}`}
          </Button>
        ) : null}
        <InviteEmployer job={match.job} compact />
      </div>
    </div>
  )
}
