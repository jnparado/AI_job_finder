import { Link } from 'react-router-dom'
import { Briefcase, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingVideo, MarketingShell } from '@/components/layout/MarketingShell'

export function LandingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="eyebrow text-center">Two sides. One Atelier.</p>
        <h1 className="mx-auto mt-4 max-w-[16ch] text-center text-4xl leading-[1.08] sm:text-6xl">
          Jobs that fit. Hires that fit.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-[#c9c0ae] sm:text-lg">
          Candidates get an AI agent that matches and prepares applications. Employers post roles and review packets sent on Atelier.
        </p>
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          <Link
            to="/candidates"
            className="rounded-3xl border border-[#c9c0ae33] bg-[#0d1b16] p-6 transition-colors hover:border-[#c6a15b]"
          >
            <User className="size-5 text-[#c6a15b]" />
            <h2 className="mt-4 text-2xl">I’m a candidate</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#c9c0ae]">
              Search authorized boards, score every role, and apply only after you approve the packet.
            </p>
            <span className="mt-5 inline-block text-sm text-[var(--copper)]">Open candidate page →</span>
          </Link>
          <Link
            to="/employers"
            className="rounded-3xl border border-[#c9c0ae33] bg-[#0d1b16] p-6 transition-colors hover:border-[#c6a15b]"
          >
            <Briefcase className="size-5 text-[#c6a15b]" />
            <h2 className="mt-4 text-2xl">I’m hiring</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#c9c0ae]">
              Post jobs on Atelier. When a candidate approves, their packet lands in your inbox.
            </p>
            <span className="mt-5 inline-block text-sm text-[var(--copper)]">Open employer page →</span>
          </Link>
        </div>
      </section>
      <LandingVideo
        kicker="Brand film"
        title="Atelier in 20 seconds"
        caption="The full story — matching, approval, hiring, and how you pay. Each audience page has its own cut."
        src="/ads/atelier-ad-16x9.mp4"
        poster="/ads/atelier-ad-01-hero.png"
      />
    </MarketingShell>
  )
}

export function CandidateLandingPage() {
  return (
    <MarketingShell audience="candidate">
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          <p className="eyebrow">For candidates</p>
          <h1 className="mt-4 max-w-[14ch] text-4xl leading-[1.08] sm:text-6xl">
            Find the jobs that actually fit you.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#c9c0ae] sm:text-lg">
            Atelier searches authorized listings, scores every role, and prepares the application.
            You review. You approve. Then it tracks what happens next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="copper" size="lg" asChild>
              <Link to="/register">Get started free</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-[#c9c0ae55] text-[var(--paper)]" asChild>
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </div>
        <ol className="space-y-4 rounded-3xl border border-[#c9c0ae33] bg-[#0d1b16] p-6 sm:p-8">
          {[
            ['Discover', 'Authorized boards and Atelier employer posts'],
            ['Match', 'Scored against your real resume'],
            ['Prepare', 'Cover letter and answers, no invented skills'],
            ['Approve', 'Nothing is sent until you say so'],
            ['Track', 'Follow-ups and interviews in one place'],
          ].map(([title, body], i) => (
            <li key={title}>
              <div className="text-xs text-[#c9c0ae]">Step {i + 1}</div>
              <div className="font-medium">{title}</div>
              <p className="text-sm text-[#c9c0ae]">{body}</p>
            </li>
          ))}
        </ol>
      </section>
      <LandingVideo
        kicker="Candidate ad"
        title="Built for applicants"
        caption="Match, prepare, approve, then apply — including packets sent to employers on Atelier."
        src="/ads/atelier-ad-candidate.mp4"
        poster="/ads/atelier-ad-candidate-hero.png"
      />
      <section className="border-t border-[#c9c0ae22] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">Plus plan</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">$19 / month</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#c9c0ae]">
            Unlimited AI applications, daily search, and interview coach. Card, Stripe, or PayPal.
          </p>
          <Button variant="copper" className="mt-6" asChild>
            <Link to="/register">Start as a candidate</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  )
}

export function EmployerLandingPage() {
  return (
    <MarketingShell audience="employer">
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          <p className="eyebrow">For employers</p>
          <h1 className="mt-4 max-w-[14ch] text-4xl leading-[1.08] sm:text-6xl">
            Post a job. Review people who actually fit.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#c9c0ae] sm:text-lg">
            Your listing appears in candidate search. When they approve a packet, it is delivered to your Atelier inbox — resume, letter, and answers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="copper" size="lg" asChild>
              <Link to="/register?role=employer">Create an employer account</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-[#c9c0ae55] text-[var(--paper)]" asChild>
              <Link to="/login">Sign in to hire</Link>
            </Button>
          </div>
        </div>
        <ol className="space-y-4 rounded-3xl border border-[#c9c0ae33] bg-[#0d1b16] p-6 sm:p-8">
          {[
            ['Post', 'Publish a role on Atelier in a few fields'],
            ['Match', 'Candidates see it scored against their profile'],
            ['Receive', 'Approved packets land in your inbox'],
            ['Decide', 'Move people to review, interview, offer, or close'],
          ].map(([title, body], i) => (
            <li key={title}>
              <div className="text-xs text-[#c9c0ae]">Step {i + 1}</div>
              <div className="font-medium">{title}</div>
              <p className="text-sm text-[#c9c0ae]">{body}</p>
            </li>
          ))}
        </ol>
      </section>
      <LandingVideo
        kicker="Employer ad"
        title="Built for hiring teams"
        caption="Post roles, collect packets, and subscribe with card, Stripe, or PayPal."
        src="/ads/atelier-ad-employer.mp4"
        poster="/ads/atelier-ad-employer-hero.png"
      />
      <section className="border-t border-[#c9c0ae22] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">Hiring plan</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">$49 / month</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#c9c0ae]">
            Unlimited job posts and a full applicant inbox. Starter is free for one role.
          </p>
          <Button variant="copper" className="mt-6" asChild>
            <Link to="/register?role=employer">Start hiring</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  )
}
