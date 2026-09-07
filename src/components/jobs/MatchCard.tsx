import { Link } from 'react-router-dom'
import type { JobMatch } from '@shared/types'
import { categoryLabel, sourceLabel } from '@shared/types'
import { laneLabel } from '@shared/engine/router'
import { moneyBand } from '@/lib/utils'
import { ScoreBadge } from './ScoreBadge'
import { Badge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function MatchCard({
  match,
  onApply,
  applying,
}: {
  match: JobMatch
  onApply?: () => void
  applying?: boolean
}) {
  const sources = match.job.sources?.length
    ? match.job.sources.map((s) => s.source)
    : [match.job.source]
  const atelier = match.job.source === 'atelier' || Boolean(match.job.employerId)
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary sm:flex-row sm:items-stretch sm:p-5">
      <Link to={`/app/jobs/${match.job.id}`} className="flex min-w-0 flex-1 gap-4">
        <ScoreBadge score={match.score} category={match.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={match.score >= 80 ? 'good' : match.score >= 70 ? 'copper' : 'default'}>
              {categoryLabel(match.category)}
            </Badge>
            {match.job.remote ? <Badge>Remote</Badge> : null}
            {atelier ? <Badge tone="copper">Apply on Atelier</Badge> : null}
            {match.aiLane ? <Badge tone="copper">{laneLabel(match.aiLane)}</Badge> : null}
            {sources.slice(0, 3).map((source) => (
              <Badge key={source}>{sourceLabel(source)}</Badge>
            ))}
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
      {onApply ? (
        <div className="flex shrink-0 items-center sm:pl-2">
          <Button variant="copper" size="sm" disabled={applying} onClick={onApply}>
            {applying ? 'Preparing…' : atelier ? 'Apply' : 'Apply with AI'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
