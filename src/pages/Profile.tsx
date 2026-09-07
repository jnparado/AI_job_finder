import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/feedback'
import { displayName } from '@shared/types'
import { Badge, Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ProfilePage() {
  const { profile } = useAuth()
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Candidate"
        title="AI career profile"
        description="This is what the matcher reads. Keep it honest — the agent will not invent skills."
        actions={
          <Button variant="outline" asChild>
            <Link to="/onboarding">Edit</Link>
          </Button>
        }
      />
      <Card>
        <h2>{displayName(profile)}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
          <Row k="Target" v={profile.desiredTitle} />
          <Row k="Experience" v={`${profile.yearsExperience} years`} />
          <Row k="Level" v={profile.careerLevel} />
          <Row k="Industry" v={profile.industry} />
          <Row k="Preferred" v={profile.workModes.join(', ')} />
          <Row k="Employment" v={profile.employmentTypes.join(', ')} />
          <Row k="Minimum salary" v={`$${profile.salaryMin.toLocaleString()} ${profile.currency}`} />
          <Row k="Locations" v={profile.locations.join(', ')} />
        </div>
        <h3 className="mt-6 font-serif">Strong skills</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.skills.map((s) => <Badge key={s}>{s}</Badge>)}
        </div>
        <h3 className="mt-6 font-serif">AI skills</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.aiSkills.map((s) => <Badge key={s} tone="copper">{s}</Badge>)}
        </div>
        <Button className="mt-6" variant="outline" asChild>
          <Link to="/onboarding">Update details</Link>
        </Button>
      </Card>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{k}</div>
      <div>{v || '—'}</div>
    </div>
  )
}
