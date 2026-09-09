import { Link } from 'react-router-dom'
import { ArrowUpRight, Briefcase, Check, MapPin, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingVideo, MarketingShell, SocialAdKit } from '@/components/layout/MarketingShell'
import { BrandCarousel } from '@/components/marketing/BrandCarousel'
import {
  AloneVsWorkshop,
  ApplyPaths,
  CANDIDATE_FAQ,
  HowWorkshopWorks,
  MatchScoreBoard,
  RisingFitFeed,
  SourceTicker,
  WorkshopFaq,
  WorkshopFor,
} from '@/components/marketing/CandidateStory'
import { SocialShare } from '@/components/social/SocialLinks'
import { EMPLOYER_HERO_SLIDES } from '@/lib/brandAssets'

const SOURCES = ['Remotive', 'Remote OK', 'Arbeitnow', 'We Work Remotely', 'Himalayas', 'Jobicy', 'Atelier']

export function LandingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c6a15b]">
            Atelier · AI-Powered Job Matching
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
        src="atelier-ad-16x9.mp4"
        poster="atelier-ad-01-hero.jpg"
      />

      <InviteClose />
    </MarketingShell>
  )
}

export function CandidateLandingPage() {
  return (
    <MarketingShell audience="candidate">
      <section id="platform" className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:py-20">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c6a15b]">
            Your AI job search workshop
          </p>
          <h1 className="mt-4 text-5xl leading-[1.02] sm:text-6xl lg:text-[4.15rem]">
            Match first.
            <br />
            Prepare the packet.
            <br />
            You send it.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#c9c0ae] sm:text-lg">
            Atelier finds roles from licensed boards and employers here, scores them against your resume, and drafts the letter. You can apply to every match. If the employer is on Atelier, we deliver the packet after you approve. If the job is on LinkedIn, Upwork, or another site, you apply on their official page — we never auto-submit there.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="copper" size="lg" className="h-12 px-7 text-[0.8rem] font-semibold uppercase tracking-[0.1em]" asChild>
              <Link to="/register">Start matching</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 border-[#c9c0ae66] px-7 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-[var(--paper)] hover:bg-[#1f3d32]"
              asChild
            >
              <Link to="/login">Log in</Link>
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2 text-xs text-[#d8d0c0]">
            {['70% recommended bar', 'Authorized boards', 'You approve every send'].map((item) => (
              <li key={item} className="rounded-full border border-[#c9c0ae33] px-3 py-1.5">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-[#c9c0ae]">You apply to the job. We never auto-apply on LinkedIn, Upwork, Indeed, or similar sites.</p>
        </div>
        <RisingFitFeed />
      </section>

      <div className="border-y border-[#c9c0ae18]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-3">
          {[
            ['Authorized', 'APIs and career pages'],
            ['0–100', 'Scored against your resume'],
            ['You send', 'Nothing leaves until you approve'],
          ].map(([n, label]) => (
            <div key={label} className="bg-[#0d1b16]/50 px-5 py-6">
              <div className="font-serif text-2xl text-[var(--paper)] sm:text-3xl">{n}</div>
              <div className="mt-1 text-xs text-[#c9c0ae] sm:text-sm">{label}</div>
            </div>
          ))}
        </div>
      </div>
      <SourceTicker />

      <AloneVsWorkshop />

      <section id="how" className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">How it works</p>
          <h2 className="mt-3 max-w-[20ch] text-3xl sm:text-5xl">From profile to send in three steps</h2>
          <HowWorkshopWorks
            steps={[
              ['01', 'Complete your profile', 'Answer a short setup and upload your resume so Atelier knows your skills, pay, and place.'],
              ['02', 'Review scored matches', 'Every role is weighed 0–100 against you. Recommended starts at 70%. Skip the rest.'],
              ['03', 'Apply your way', 'We draft the packet. On Atelier we deliver it after you approve. On LinkedIn, Upwork, or other sites, you submit on their official page.'],
            ]}
          />
        </div>
      </section>

      <section id="matches" className="px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">Match scoring</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl sm:text-5xl">Only sit with roles worth your time</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#c9c0ae] sm:text-base">
            Tell us title, salary floor, and must-haves. We score live postings and Atelier employer roles against that profile. Cards below are a sample workshop profile — not a feed of famous logos.
          </p>
          <MatchScoreBoard />
        </div>
      </section>

      <ApplyPaths />

      <section className="px-5 pb-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-start gap-8 overflow-hidden rounded-[2rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="eyebrow text-[#c6a15b]">The letter</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Written for that role — in your voice</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#c9c0ae] sm:text-base">
              Atelier drafts from your resume and the posting. You edit. Then you apply — send to an Atelier employer, or paste it on their official listing.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--paper)]">
              {['Opening tied to the listing', 'Skills you actually have', 'You apply — we never auto-submit on other sites'].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="size-2 shrink-0 rounded-full bg-[#c6a15b]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-[#c9c0ae22] bg-[#f7f4ee] p-8 text-[#161c19] sm:p-10 lg:border-t-0 lg:border-l">
            <p className="text-xs uppercase tracking-[0.14em] text-[#8f4326]">Draft · Northwind Labs</p>
            <p className="mt-4 font-serif text-lg leading-relaxed">
              I am writing about the AI Automation Engineer role. I have shipped agent workflows in TypeScript and Python, including retrieval over internal docs — the same shape of problem in your listing.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#3d4541]">
              I would rather send a short, true letter than a sprayed template. If this packet looks right, I will send it from the workshop.
            </p>
            <p className="mt-6 text-sm font-medium">— Your name, after you approve</p>
            <Button variant="copper" className="mt-6" asChild>
              <Link to="/register">Prepare a letter</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="inbox" className="px-5 pb-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">Inbox</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl sm:text-5xl">Every send, reply, and interview in one place</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['12', 'Packets ready'],
              ['4', 'Sent this week'],
              ['2', 'Interviews to prep'],
            ].map(([n, label]) => (
              <div key={label} className="rounded-[1.5rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 px-6 py-6">
                <div className="font-serif text-4xl">{n}</div>
                <div className="mt-1 text-sm text-[#c9c0ae]">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3 rounded-[1.5rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 p-5">
            {[
              ['Northwind Labs', 'Packet ready · you apply on their listing'],
              ['Harbor Pay', 'Copied letter · submit on their career page'],
              ['Atelier Labs', 'Sent · message the employer'],
            ].map(([who, status]) => (
              <Link
                key={who}
                to="/register"
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#13261f] px-4 py-3 transition-colors hover:bg-[#1f3d32]"
              >
                <span className="font-medium">{who}</span>
                <span className="text-sm text-[#c9c0ae]">{status}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <WorkshopFor />

      <LandingVideo
        kicker="Candidate film"
        title="Match. Prepare. Approve."
        caption="The workshop searches, scores, and drafts. You decide what leaves."
        src="atelier-ad-candidate.mp4"
        poster="atelier-ad-candidate-hero.jpg"
      />
      <SocialAdKit audience="candidate" />

      <WorkshopFaq items={CANDIDATE_FAQ} />
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
            Post a role on Atelier. Candidates who match prepare a packet and send it only after they approve. You meet people who meant to apply — not a pile of unsolicited resumes.
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
              <Link to="/">See candidate side</Link>
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2 text-xs text-[#d8d0c0]">
            {['Approved packets only', 'Message candidates in-app', 'One hiring inbox'].map((item) => (
              <li key={item} className="rounded-full border border-[#c9c0ae33] px-3 py-1.5">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <BrandCarousel folder="employer" slides={EMPLOYER_HERO_SLIDES} />
      </section>

      <section id="features" className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">Why teams use the workshop</p>
          <h2 className="mt-3 max-w-[18ch] text-3xl sm:text-5xl">Post once. Meet people who chose to send.</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-[1.75rem] border border-[#c9c0ae22] bg-[#0d1b16]/50 p-7">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9a9386]">The usual inbox</p>
              <ul className="mt-5 space-y-3 text-sm text-[#c9c0ae]">
                {['Untargeted applications', 'Resumes with no letter', 'No sense of why they applied', 'Chasing people who never meant to talk'].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#b85c38]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.75rem] border border-[#c6a15b44] bg-[#1f3d32]/80 p-7">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">On Atelier</p>
              <ul className="mt-5 space-y-3 text-sm text-[#e7e1d4]">
                {['Role scored against a real profile', 'Packet arrives only after they approve', 'Letter and answers in one place', 'Message them, then move to interview'].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#c6a15b]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">How it works</p>
          <h2 className="mt-3 max-w-[18ch] text-3xl sm:text-5xl">From a listing to a shortlist in three steps</h2>
          <HowWorkshopWorks
            steps={[
              ['01', 'Post the role', 'Write the listing once on Atelier. Candidates whose profiles fit see it in search.'],
              ['02', 'They approve a packet', 'Matched people prepare a letter and answers. Nothing hits your inbox until they send.'],
              ['03', 'You decide', 'Review the packet, message the candidate, then move them to interview, offer, or close.'],
            ]}
          />
        </div>
      </section>

      <section id="help" className="px-5 pb-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-[#c6a15b]">How we help</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl sm:text-5xl">From a listing to a shortlist you can trust</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <HelpShot
              src="/brand/employer/employer-inbox.jpg"
              title="Approved packets"
              body="Resume, letter, and answers arrive only after the candidate says yes."
            />
            <HelpShot
              src="/brand/employer/employer-team.jpg"
              title="A shortlist you can trust"
              body="Every listing is scored against a real profile. You see why they fit."
            />
            <HelpShot
              src="/brand/employer/employer-interview.jpg"
              title="Decide with context"
              body="Message them, then move to interview, offer, or close from one inbox."
            />
          </div>
        </div>
      </section>

      <section id="inbox" className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 p-8 sm:p-12">
          <p className="eyebrow text-[#c6a15b]">Inbox</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Packets, not cold resumes</h2>
          <div className="mt-8 space-y-3">
            {[
              ['Full Stack Engineer', '94 match · packet approved'],
              ['AI Automation Engineer', '91 match · letter attached'],
              ['React Engineer', '88 match · ready to review'],
            ].map(([title, meta]) => (
              <Link
                key={title}
                to="/register?role=employer"
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#13261f] px-5 py-4 transition-colors hover:bg-[#1f3d32]"
              >
                <span className="font-serif text-xl">{title}</span>
                <span className="text-sm text-[#c9c0ae]">{meta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="serve" className="px-5 pb-8 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 lg:grid-cols-2">
          <img
            src="/brand/employer/employer-office.jpg"
            alt="A calm modern office"
            className="h-full min-h-[280px] w-full object-cover lg:min-h-[420px]"
          />
          <div className="p-8 sm:p-12">
            <p className="eyebrow text-[#c6a15b]">Who we serve</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Studios, startups, and hiring teams</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#c9c0ae] sm:text-base">
              Publish a role on Atelier. Candidates who match see it in search. When they approve a packet, it lands in your inbox — ready to review.
            </p>
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
        src="atelier-ad-employer.mp4"
        poster="atelier-ad-employer-hero.jpg"
      />
      <SocialAdKit audience="employer" />
      <WorkshopFaq
        items={[
          {
            q: 'Do you auto-apply candidates from LinkedIn or Upwork?',
            a: 'No. Candidates can apply to those jobs themselves on the official page. Atelier only delivers a packet to your inbox when they match your Atelier listing and approve send.',
          },
          {
            q: 'Do candidates auto-apply to my role?',
            a: 'No. They match, prepare a packet, and send it only after they approve. You will not get a spray of unreviewed applications from Atelier.',
          },
          {
            q: 'Where does the listing appear?',
            a: 'On Atelier search for candidates whose profile fits. We do not post it to LinkedIn or Indeed for you.',
          },
          {
            q: 'What is in a packet?',
            a: 'A tailored resume draft, a letter, and answers they approved. You see why they scored against the role.',
          },
          {
            q: 'Can I message candidates?',
            a: 'Yes. Once a packet is in your inbox, you can write to that candidate on Atelier and they can reply. This is only for people who applied to your Atelier listing — not LinkedIn or Upwork applicants.',
          },
          {
            q: 'Is there a fee to post?',
            a: 'Hiring is free for your first year — unlimited roles and inbox. After that, the Hiring plan is billed yearly. There is no monthly subscription.',
          },
        ]}
      />
      <InviteClose audience="employer" />
    </MarketingShell>
  )
}

function HelpShot({ src, title, body }: { src: string; title: string; body: string }) {
  return (
    <Link to="/register?role=employer" className="overflow-hidden rounded-[1.5rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 transition-colors hover:border-[#c6a15b66]">
      <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
      <div className="p-5">
        <h3 className="text-xl">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#c9c0ae]">{body}</p>
      </div>
    </Link>
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

function InviteClose({ audience }: { audience?: 'candidate' | 'employer' }) {
  const candidate = audience !== 'employer'
  const employer = audience !== 'candidate'
  return (
    <section className="px-5 pb-16 sm:px-8 sm:pb-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#c9c0ae22] bg-[#0d1b16]/80 px-6 py-12 text-center sm:px-12 sm:py-16">
        <img
          src="/brand/atelier-logo.jpg"
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
              ? 'Create an account, upload a resume, and we score live listings against you. Apply to any match — we deliver packets only to Atelier employers; other sites you submit yourself.'
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

function HeroMatchCard({ compact }: { compact?: boolean }) {
  return (
    <div className="relative">
      {compact ? null : <div className="absolute -inset-6 rounded-[2rem] bg-[#c6a15b14] blur-2xl" />}
      <div
        className={`relative border border-[#e7e1d4] bg-[#f7f4ee] text-[#161c19] shadow-[0_28px_70px_-30px_rgba(0,0,0,0.65)] ${
          compact ? 'rounded-[1.35rem] p-4 sm:p-5' : 'rounded-[1.75rem] p-6 sm:p-7'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#1c5c3a]">95 match</p>
            <h3 className={`mt-2 font-serif leading-tight ${compact ? 'text-2xl' : 'text-3xl'}`}>Full Stack Engineer</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5c635f]">
              <Briefcase className="size-3.5" />
              Atelier Labs
            </p>
          </div>
          <span
            className={`grid place-items-center rounded-2xl bg-[#e6f3ea] font-serif text-[#1c5c3a] ${
              compact ? 'size-12 text-xl' : 'size-14 text-2xl'
            }`}
          >
            95
          </span>
        </div>
        <div className={`flex flex-wrap gap-2 ${compact ? 'mt-3' : 'mt-5'}`}>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ece9e2] px-2.5 py-1 text-xs">
            <MapPin className="size-3" />
            Remote
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f3ea] px-2.5 py-1 text-xs text-[#1c5c3a]">
            <Sparkles className="size-3" />
            Excellent match
          </span>
        </div>
        {compact ? null : (
          <p className="mt-5 text-sm leading-relaxed text-[#3d4541]">
            Scored against your real profile — Next.js, Node, and Postgres. No invented skills.
          </p>
        )}
        <Link
          to="/register"
          className={`flex items-center justify-center gap-2 rounded-full bg-[var(--copper)] text-sm font-medium text-[var(--paper)] ${
            compact ? 'mt-4 h-10' : 'mt-6 h-11'
          }`}
        >
          Send to employer
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}

