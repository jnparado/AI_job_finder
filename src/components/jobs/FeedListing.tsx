import { Link } from 'react-router-dom'
import type { JobMatch } from '@shared/types'
import { sourceLabel } from '@shared/types'
import { moneyBand, postedLabel, textSnippet } from '@/lib/utils'
import { Badge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InviteEmployer } from '@/components/jobs/InviteEmployer'

export function FeedListing({
  match,
  onApply,
  applying,
}: {
  match: JobMatch
  onApply?: () => void
  applying?: boolean
}) {
  const job = match.job
  const atelier = job.source === 'atelier' || Boolean(job.employerId)
  const skills = [...new Set([...(match.matchedSkills ?? []), ...job.skills])].slice(0, 6)
  const meta = [
    postedLabel(job.postedAt),
    job.remote ? 'Remote' : job.location,
    job.employmentType?.replace('-', ' '),
    moneyBand(job.salaryMin, job.salaryMax, job.currency),
  ].filter(Boolean)

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_0_rgba(19,38,31,0.04)] transition-colors hover:border-[var(--forest)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/app/jobs/${job.id}`} className="block">
            <h3 className="font-serif text-[1.35rem] leading-tight text-[var(--forest)] hover:text-[var(--copper)]">
              {job.title}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.company}
            {meta.length ? ` · ${meta.join(' · ')}` : ''}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#e8efe8] px-2.5 py-1 font-serif text-sm tabular-nums text-[var(--forest)]">
          {match.score}
          <span className="ml-1 font-sans text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
            fit
          </span>
        </span>
      </div>
      {job.description ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">{textSnippet(job.description)}</p>
      ) : match.recommendation ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">{match.recommendation}</p>
      ) : null}
      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-xs text-[var(--forest)]"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {atelier ? <Badge tone="copper">Atelier desk</Badge> : <Badge>{sourceLabel(job.source)}</Badge>}
          {job.remote ? <Badge>Remote</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InviteEmployer job={job} compact />
          <Button variant="outline" size="sm" asChild>
            <Link to={`/app/jobs/${job.id}`}>Why it fits</Link>
          </Button>
          {onApply ? (
            <Button variant="copper" size="sm" disabled={applying} onClick={onApply}>
              {applying ? 'Preparing…' : atelier ? 'Send packet' : `Apply on ${sourceLabel(job.source)}`}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
