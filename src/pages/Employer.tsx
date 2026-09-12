import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HiringHero } from '@/components/employer/HiringChrome'
import { PortalHome } from '@/components/employer/PortalHome'
import { JobsDesk } from '@/components/employer/JobsDesk'
import { ApplicantsDesk } from '@/components/employer/ApplicantsDesk'
import { FindCandidatesDesk } from '@/components/employer/FindCandidatesDesk'
import { CompanyProfileDesk } from '@/components/employer/CompanyProfileDesk'
import { PostJobWizard } from '@/components/employer/PostJobWizard'

export function EmployerSetupPage() {
  const { profile, saveProfile, destinationFor } = useAuth()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState(profile.companyName ?? '')
  const [companyWebsite, setCompanyWebsite] = useState(profile.companyWebsite ?? '')
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)

  if (profile.role !== 'employer') {
    return <Navigate to={destinationFor(profile)} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await saveProfile({
      role: 'employer',
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim(),
      firstName,
      lastName,
      onboardingCompleted: true,
    })
    navigate('/employer/jobs/new', { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <HiringHero
        kicker="Hiring"
        title="Set up your company"
        description="Candidates will see this name on jobs you post. You can change it later."
        image="employer-studio.jpg"
        imageAlt="Studio hiring desk"
        compact
      />
      <Card className="mt-6">
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block space-y-1.5">
            <Label>Your name</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First" required />
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last" required />
            </div>
          </label>
          <label className="block space-y-1.5">
            <Label>Company name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <Label>Website (optional)</Label>
            <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
          </label>
          <Button variant="copper" type="submit">
            Open hiring dashboard
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function EmployerDashboardPage() {
  return <PortalHome />
}

export function EmployerJobsPage() {
  return <JobsDesk />
}

export function EmployerPostJobPage() {
  return <PostJobWizard />
}

export function EmployerInboxPage() {
  return <ApplicantsDesk />
}

export function EmployerCandidatesPage() {
  return <FindCandidatesDesk />
}

export function EmployerApplicationPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const job = params.get('job')
  const next = new URLSearchParams()
  if (id) next.set('id', id)
  if (job) next.set('job', job)
  return <Navigate to={`/employer/inbox?${next.toString()}`} replace />
}

export function EmployerCompanyPage() {
  return <CompanyProfileDesk />
}

export function EmployerSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <HiringHero
        kicker="Workspace"
        title="Settings"
        description="Hiring account, pay, and the time tracker. Packets still leave only after the candidate approves."
        compact
      />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Company profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Name and website shown on your jobs.</p>
        </div>
        <Link to="/employer/company" className="text-sm font-medium text-[#147a48]">
          Edit
        </Link>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">Send pay to people hired on Atelier.</p>
        </div>
        <Link to="/employer/finances" className="text-sm font-medium text-[#147a48]">
          Open payments
        </Link>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Contracts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hired roles, hours, and pay on Atelier.</p>
        </div>
        <Link to="/employer/contracts" className="text-sm font-medium text-[#147a48]">
          Open contracts
        </Link>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Time tracker</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hours hired candidates log after you mark them hired.</p>
        </div>
        <Link to="/employer/ateliar" className="text-sm font-medium text-[#147a48]">
          Open tracker
        </Link>
      </Card>
    </div>
  )
}
