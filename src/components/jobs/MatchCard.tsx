import { Link } from 'react-router-dom'
import type { JobMatch } from '@shared/types'
import { categoryLabel } from '@shared/types'
import { moneyBand } from '@/lib/utils'
import { ScoreBadge } from './ScoreBadge'
import { Badge } from '@/components/ui/card'

export function MatchCard({ match }: { match: JobMatch }) {
  return (
    <Link
      to={`/app/jobs/${match.job.id}`}
      className="group flex gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary sm:p-5"
    >
      <ScoreBadge score={match.score} category={match.category} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={match.score >= 80 ? 'good' : match.score >= 70 ? 'copper' : 'default'}>
            {categoryLabel(match.category)}
          </Badge>
          {match.job.remote ? <Badge>Remote</Badge> : null}
        </div>
        <h3 className="mt-1.5 font-serif text-xl leading-tight group-hover:text-primary">
          {match.job.title}
        </h3>
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
  )
}
