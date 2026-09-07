import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { JobMatch } from '@shared/types'
import { displayName } from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { greeting, moneyBand } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Badge } from '@/components/ui/card'
import { EmptyState, PageHeader } from '@/components/ui/feedback'
import { MatchCard } from '@/components/jobs/MatchCard'
import { ScoreBadge } from '@/components/jobs/ScoreBadge'

export function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const jobs = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<JobMatch[]>('/api/jobs'),
  })
  const apps = useQuery({
    queryKey: ['applications'],
    queryFn: () => api<{ id: string; status: string }[]>('/api/applications'),
  })
  const search = useMutation({
    mutationFn: () => api('/api/agent/search', { method: 'POST', body: '{}' }),
    onSuccess: () => void jobs.refetch(),
  })

  const matches = jobs.data ?? []
  const recommended = matches.filter((m) => m.score >= 70)
  const excellent = matches.filter((m) => m.category === 'excellent').length
  const strong = matches.filter((m) => m.category === 'strong').length
  const good = matches.filter((m) => m.category === 'good').length
  const top = recommended[0] ?? matches[0]
  const applied = (apps.data ?? []).filter((a) => a.status !== 'draft').length
  const first = displayName(profile).split(' ')[0] || 'there'

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Dashboard"
        title={`${greeting()}, ${first}`}
        description={
          jobs.isLoading
            ? 'Loading your matches…'
            : recommended.length
              ? `${recommended.length} roles currently clear your 70% bar.`
              : 'Run the job agent to score authorized listings against your profile.'
        }
        actions={
          <Button variant="copper" onClick={() => search.mutate()} disabled={search.isPending}>
            {search.isPending ? 'Searching…' : 'Find new jobs'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat n={matches.length} label="Found" />
        <Stat n={excellent} label="Excellent" />
        <Stat n={strong} label="Strong" />
        <Stat n={good} label="Good" />
        <Stat n={applied} label="Applied" />
      </div>

      {jobs.isLoading ? (
        <Card className="h-40 animate-pulse bg-muted/60" />
      ) : top ? (
        <Card className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <ScoreBadge score={top.score} category={top.category} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Today’s top recommendation</p>
            <h2 className="mt-1 text-2xl sm:text-3xl">{top.job.title}</h2>
            <p className="mt-1 text-muted-foreground">
              {top.job.company} · {top.job.remote ? 'Remote' : top.job.location} ·{' '}
              {moneyBand(top.job.salaryMin, top.job.salaryMax, top.job.currency)}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">{top.recommendation}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => navigate(`/app/jobs/${top.job.id}`)}>See why it fits</Button>
              <Button variant="copper" onClick={() => navigate(`/app/jobs/${top.job.id}`)}>
                Apply with AI
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No matches yet"
          body="Complete your profile, then let the agent search authorized sources. It will score every role before showing it here."
          actionLabel="Find jobs now"
          onClick={() => search.mutate()}
        />
      )}

      <CareerCard />

      {matches.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-2xl">Top matches</h2>
            <Button variant="link" className="text-[var(--copper)]" asChild>
              <Link to="/app/jobs">View all jobs</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {matches.slice(0, 5).map((m) => (
              <MatchCard key={m.job.id} match={m} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function CareerCard() {
  const { profile } = useAuth()
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Your career profile</p>
          <h2 className="mt-1">{displayName(profile) || 'Candidate'}</h2>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/app/profile">Edit profile</Link>
        </Button>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Target</dt>
          <dd className="mt-1 font-medium">{profile.desiredTitle || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Experience</dt>
          <dd className="mt-1 font-medium">{profile.yearsExperience} years</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Work style</dt>
          <dd className="mt-1 font-medium capitalize">{profile.workModes.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Salary floor</dt>
          <dd className="mt-1 font-medium">${profile.salaryMin.toLocaleString()}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {profile.skills.slice(0, 8).map((s) => (
          <Badge key={s}>{s}</Badge>
        ))}
        {profile.aiSkills.map((s) => (
          <Badge key={s} tone="copper">{s}</Badge>
        ))}
      </div>
    </Card>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <Card className="py-4">
      <div className="font-serif text-3xl tabular-nums">{n}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </Card>
  )
}
