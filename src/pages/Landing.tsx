import { Link } from 'react-router-dom'
import { ArrowUpRight, Briefcase, MapPin, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingVideo, MarketingShell } from '@/components/layout/MarketingShell'
import { SocialShare } from '@/components/social/SocialLinks'

const SOURCES = ['Remotive', 'Remote OK', 'Arbeitnow', 'We Work Remotely', 'Himalayas', 'Jobicy', 'Atelier']

export function LandingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c6a15b]">
            Atelier · AI Job Assistant
          </p>
          <span className="mt-5 block h-px w-12 bg-[#c6a15b]" />
          <h1 className="mt-6 max-w-[12ch] text-5xl leading-[1.02] sm:text-7xl">
            Jobs that fit. Hires that fit.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#c9c0ae] sm:text-lg">
            Candidates get an agent that matches and prepares. Employers review packets sent only after approval.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="copper" size="lg" asChild>
              <Link to="/register">Find a job</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]" asChild>
              <Link to="/register?role=employer">Post a role</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#8f8878]">Free to start. You approve every send.</p>
        </div>
        <HeroMatchCard />
      </section>

      <div className="border-y border-[#c9c0ae18]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4 text-[0.72rem] uppercase tracking-[0.14em] text-[#c9c0ae] sm:px-8">
          <span>70% recommended bar</span>
          <span>Authorized boards only</span>
          <span>You approve every send</span>
          <span>Free to start</span>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-xl">
          <p className="eyebrow text-[#c6a15b]">Choose a side</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Two doors. Same workshop.</h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <AudienceCard
            to="/register"
            icon={User}
            kicker="Candidates"
            title="I’m looking"
            body="Search authorized boards, score every role against your resume, and apply only after you approve the packet."
            cta="Create a free account"
          />
          <AudienceCard
            to="/register?role=employer"
            icon={Briefcase}
            kicker="Employers"
            title="I’m hiring"
            body="Post a role on Atelier. When a candidate approves, their resume, letter, and answers land in your inbox."
            cta="Post your first role"
          />
        </div>
      </section>

      <section className="border-t border-[#c9c0ae18] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">How it works</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl sm:text-4xl">Match. Approve. Then send.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['01', 'Discover', 'Live listings from authorized APIs, career pages, and jobs posted on Atelier.'],
              ['02', 'Score', 'Every role is weighed against your real skills, title, salary, and location.'],
              ['03', 'Approve', 'The agent prepares the packet. Nothing leaves until you say so — then we track it.'],
            ].map(([n, title, body]) => (
              <div key={n} className="rounded-3xl border border-[#c9c0ae22] bg-[#0d1b16]/70 p-6">
                <p className="font-serif text-2xl text-[#c6a15b]">{n}</p>
                <h3 className="mt-4 text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#c9c0ae]">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs uppercase tracking-[0.14em] text-[#8f8878]">
            Sources · {SOURCES.join(' · ')}
          </p>
        </div>
      </section>

      <LandingVideo
        kicker="Brand film"
        title="Atelier in 20 seconds"
        caption="Matching, approval, and hiring — in twenty seconds."
        src="/ads/atelier-ad-16x9.mp4"
        poster="/ads/atelier-ad-01-hero.png"
      />

      <InviteClose />
    </MarketingShell>
  )
}

export function CandidateLandingPage() {
  return (
    <MarketingShell audience="candidate">
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c6a15b]">
            Atelier · Applicants
          </p>
          <span className="mt-5 block h-px w-12 bg-[#c6a15b]" />
          <h1 className="mt-6 max-w-[13ch] text-5xl leading-[1.02] sm:text-6xl">
            Find the jobs that actually fit you.
          </h1>
          <p className="mt-4 font-serif text-xl text-[#d8d0c0]">Match. Prepare. Approve. Apply.</p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#c9c0ae] sm:text-lg">
            Atelier searches authorized listings, scores every role, and prepares the application. You review. You approve. Then it tracks what happens next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="copper" size="lg" asChild>
              <Link to="/register">Get started free</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]" asChild>
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </div>
        <HeroMatchCard />
      </section>
      <StepPanel
        steps={[
          ['Discover', 'Authorized boards and Atelier employer posts'],
          ['Match', 'Scored against your real resume'],
          ['Prepare', 'Cover letter and answers, no invented skills'],
          ['Approve', 'Nothing is sent until you say so'],
          ['Track', 'Follow-ups and interviews in one place'],
        ]}
      />
      <LandingVideo
        kicker="Candidate ad"
        title="Built for applicants"
        caption="Match, prepare, approve, then apply — including packets sent to employers on Atelier."
        src="/ads/atelier-ad-candidate.mp4"
        poster="/ads/atelier-ad-candidate-hero.png"
      />
      <InviteClose audience="candidate" />
    </MarketingShell>
  )
}

export function EmployerLandingPage() {
  return (
    <MarketingShell audience="employer">
      <section id="platform" className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-20">
        <div>
          <p className="text-sm text-[#c9c0ae]">Hiring software for modern teams</p>
          <h1 className="mt-4 text-5xl leading-[1.02] sm:text-6xl lg:text-[4.25rem]">
            Hire smarter.
            <br />
            Match faster.
            <br />
            Review real packets.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#c9c0ae] sm:text-lg">
            Atelier helps employers post roles, receive approved applications, and decide who to meet — without a pile of unsolicited resumes.
          </p>
          <p className="mt-5 flex items-center gap-2.5 text-sm text-[var(--paper)]">
            <span className="size-2 shrink-0 rounded-full bg-[#c6a15b]" />
            One inbox for people who actually fit
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="paper" size="lg" className="h-12 px-7 text-[0.8rem] font-semibold uppercase tracking-[0.1em]" asChild>
              <Link to="/register?role=employer">Post a role</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 border-[#c9c0ae66] px-7 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper)] hover:bg-[#1f3d32]"
              asChild
            >
              <Link to="/candidates">Find talent</Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <img
            src="/brand/employer/employer-hero.png"
            alt="Hiring manager reviewing matches on a tablet"
            className="aspect-[3/4] w-full rounded-[1.75rem] object-cover shadow-[0_40px_80px_-36px_rgba(0,0,0,0.7)] sm:aspect-[4/5] lg:aspect-[3/4]"
          />
        </div>
      </section>

      <section id="help" className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">How we help</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl sm:text-5xl">Post once. Meet people who fit.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <HelpShot
              src="/brand/employer/employer-inbox.png"
              title="Approved packets"
              body="Resume, letter, and answers arrive only after the candidate says yes."
            />
            <HelpShot
              src="/brand/employer/employer-team.png"
              title="A shortlist you can trust"
              body="Every listing is scored against a real profile. You see why they fit."
            />
            <HelpShot
              src="/brand/employer/employer-interview.png"
              title="Decide with context"
              body="Move people to interview, offer, or close from one inbox."
            />
          </div>
        </div>
      </section>

      <section id="serve" className="px-5 pb-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 lg:grid-cols-2">
          <img
            src="/brand/employer/employer-office.png"
            alt="A calm modern office"
            className="h-full min-h-[280px] w-full object-cover lg:min-h-[420px]"
          />
          <div className="p-8 sm:p-12">
            <p className="eyebrow text-[#c6a15b]">Who we serve</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Studios, startups, and hiring teams</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#c9c0ae] sm:text-base">
              Publish a role on Atelier. Candidates who match see it in search. When they approve a packet, it lands in your inbox — ready to review.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--paper)]">
              {['Growing product teams', 'Studios hiring specialists', 'Founders filling the next seat'].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="size-2 shrink-0 rounded-full bg-[#c6a15b]" />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="paper" className="mt-8" asChild>
              <Link to="/register?role=employer">Create an employer account</Link>
            </Button>
          </div>
        </div>
      </section>

      <LandingVideo
        kicker="Employer film"
        title="Built for hiring teams"
        caption="Post a role, collect approved packets, and decide who to meet."
        src="/ads/atelier-ad-employer.mp4"
        poster="/ads/atelier-ad-employer-hero.png"
      />
      <InviteClose audience="employer" />
    </MarketingShell>
  )
}

function HelpShot({ src, title, body }: { src: string; title: string; body: string }) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#c9c0ae22] bg-[#0d1b16]/70">
      <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
      <div className="p-5">
        <h3 className="text-xl">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#c9c0ae]">{body}</p>
      </div>
    </article>
  )
}

function AudienceCard({
  to,
  icon: Icon,
  kicker,
  title,
  body,
  cta,
}: {
  to: string
  icon: typeof User
  kicker: string
  title: string
  body: string
  cta: string
}) {
  return (
    <Link
      to={to}
      className="group rounded-[1.75rem] border border-[#c9c0ae22] bg-[#0d1b16]/80 p-7 transition-colors hover:border-[#c6a15b66] sm:p-8"
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-[#1f3d32] text-[#c6a15b]">
        <Icon className="size-5" />
      </span>
      <p className="mt-6 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">{kicker}</p>
      <h3 className="mt-2 text-3xl">{title}</h3>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#c9c0ae]">{body}</p>
      <span className="mt-6 inline-flex items-center gap-1 text-sm text-[var(--copper)]">
        {cta}
        <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

function StepPanel({ steps }: { steps: [string, string][] }) {
  return (
    <section className="px-5 pb-4 sm:px-8">
      <ol
        className={`mx-auto grid max-w-6xl gap-px overflow-hidden rounded-[1.75rem] border border-[#c9c0ae22] bg-[#c9c0ae22] sm:grid-cols-2 ${
          steps.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
        }`}
      >
        {steps.map(([title, body], i) => (
          <li key={title} className="bg-[#0d1b16] p-5 sm:p-6">
            <div className="text-[0.68rem] uppercase tracking-[0.14em] text-[#c6a15b]">Step {i + 1}</div>
            <div className="mt-2 font-serif text-xl">{title}</div>
            <p className="mt-2 text-sm leading-relaxed text-[#c9c0ae]">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function InviteClose({ audience }: { audience?: 'candidate' | 'employer' }) {
  const candidate = audience !== 'employer'
  const employer = audience !== 'candidate'
  return (
    <section className="px-5 pb-16 sm:px-8 sm:pb-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#c9c0ae22] bg-[#0d1b16]/80 px-6 py-12 text-center sm:px-12 sm:py-16">
        <img
          src="/brand/atelier-logo.png"
          alt=""
          width={72}
          height={72}
          className="mx-auto size-[4.5rem] rounded-2xl object-cover shadow-[0_0_0_1px_rgba(198,161,91,0.28)]"
        />
        <p className="mt-6 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c6a15b]">
          Begin in the workshop
        </p>
        <h2 className="mx-auto mt-3 max-w-[16ch] text-3xl sm:text-5xl">
          {audience === 'employer'
            ? 'Post a role. Meet people who fit.'
            : audience === 'candidate'
              ? 'Find the roles that fit you.'
              : 'Come in. Start free.'}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#c9c0ae] sm:text-base">
          {audience === 'employer'
            ? 'Create an account and publish your first listing. Matched candidates send a packet only after they approve it.'
            : audience === 'candidate'
              ? 'Create an account, upload a resume, and we score live listings against you. Nothing is sent until you say so.'
              : 'Candidates match and apply with approval. Employers post a role and review real packets. No card required to begin.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {candidate ? (
            <Button variant="copper" size="lg" asChild>
              <Link to="/register">Get started free</Link>
            </Button>
          ) : null}
          {employer ? (
            <Button
              variant={candidate ? 'outline' : 'copper'}
              size="lg"
              className={candidate ? 'border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]' : undefined}
              asChild
            >
              <Link to="/register?role=employer">Post a role free</Link>
            </Button>
          ) : null}
        </div>
        <div className="mt-8 flex justify-center">
          <SocialShare light />
        </div>
      </div>
    </section>
  )
}

function HeroMatchCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-[#c6a15b14] blur-2xl" />
      <div className="relative rounded-[1.75rem] border border-[#e7e1d4] bg-[#f7f4ee] p-6 text-[#161c19] shadow-[0_28px_70px_-30px_rgba(0,0,0,0.65)] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#1c5c3a]">95 match</p>
            <h3 className="mt-2 font-serif text-3xl leading-tight">Full Stack Engineer</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5c635f]">
              <Briefcase className="size-3.5" />
              Atelier Labs
            </p>
          </div>
          <span className="grid size-14 place-items-center rounded-2xl bg-[#e6f3ea] font-serif text-2xl text-[#1c5c3a]">
            95
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ece9e2] px-2.5 py-1 text-xs">
            <MapPin className="size-3" />
            Remote
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f3ea] px-2.5 py-1 text-xs text-[#1c5c3a]">
            <Sparkles className="size-3" />
            Excellent match
          </span>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-[#3d4541]">
          Scored against your real profile — Next.js, Node, and Postgres. No invented skills.
        </p>
        <div className="mt-6 flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--copper)] text-sm font-medium text-[var(--paper)]">
          Apply
          <ArrowUpRight className="size-4" />
        </div>
      </div>
    </div>
  )
}

