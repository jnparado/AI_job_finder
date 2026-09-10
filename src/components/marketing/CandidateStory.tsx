import { Link } from 'react-router-dom'
import { ArrowUpRight, Briefcase, Check, ChevronDown, MapPin, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const SAMPLE_FITS = [
  {
    company: 'Northwind Labs',
    initials: 'NL',
    mark: '#1c5c3a',
    title: 'AI Automation Engineer',
    place: 'Remote · contract',
    score: 94,
    onAtelier: false,
    why: 'Your TypeScript, agents, and RAG work line up with the brief.',
    points: ['Agent and automation work', 'Node and Python already in your stack', 'You apply on their official listing'],
  },
  {
    company: 'Harbor Pay',
    initials: 'HP',
    mark: '#8f4326',
    title: 'React Engineer',
    place: 'Remote · full-time',
    score: 91,
    onAtelier: false,
    why: 'The dashboard work matches how you already ship UI.',
    points: ['React and TypeScript', 'Product-facing features', 'You apply on their official listing'],
  },
  {
    company: 'Manila Cloud',
    initials: 'MC',
    mark: '#3d5a80',
    title: 'Full Stack Developer',
    place: 'Philippines / remote',
    score: 89,
    onAtelier: false,
    why: 'Title, location, and stack all sit inside your range.',
    points: ['Full stack scope', 'Regional and remote options', 'You apply on their official listing'],
  },
  {
    company: 'Atelier Labs',
    initials: 'AL',
    mark: '#b08a3c',
    title: 'Full Stack Engineer',
    place: 'Remote · full-time',
    score: 95,
    onAtelier: true,
    why: 'Posted on Atelier. After you approve, the packet goes to their inbox.',
    points: ['Next.js and Node', 'Employer is on Atelier', 'We deliver only after you approve'],
  },
  {
    company: 'Brightloop',
    initials: 'BR',
    mark: '#5c635f',
    title: 'Frontend Engineering Intern',
    place: 'Hybrid · internship',
    score: 72,
    onAtelier: false,
    why: 'A stretch role — shown so you can skip it, not so we hide the score.',
    points: ['Frontend overlap', 'Below senior target', 'You decide whether to apply'],
  },
  {
    company: 'Cloudspan',
    initials: 'CS',
    mark: '#6b4c7a',
    title: 'Enterprise Account Executive',
    place: 'United States · full-time',
    score: 58,
    onAtelier: false,
    why: 'Shown as a miss. Sales-led work is outside this workshop profile.',
    points: ['Wrong function', 'Would not pass the 70% bar', 'Easy to skip'],
  },
]

function applyCta(job: { onAtelier: boolean }) {
  return job.onAtelier ? 'Send to employer' : 'Prepare & apply'
}

export const WORKSHOP_SOURCES = [
  'Remotive',
  'Remote OK',
  'Arbeitnow',
  'We Work Remotely',
  'Himalayas',
  'Jobicy',
  'Atelier employers',
]

type Fit = (typeof SAMPLE_FITS)[number]

function CompanyMark({ job, size = 'md' }: { job: Fit; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-serif text-[var(--paper)] ${
        size === 'sm' ? 'size-9 text-sm' : 'size-11 text-base'
      }`}
      style={{ background: job.mark }}
      aria-hidden
    >
      {job.initials}
    </span>
  )
}

export function FitCard({
  job,
  compact,
}: {
  job: Fit
  compact?: boolean
}) {
  const excellent = job.score >= 90
  const recommended = job.score >= 70

  if (compact) {
    return (
      <article className="rounded-2xl border border-[#e7e1d4] bg-[#f7f4ee] p-4 text-[#161c19] shadow-[0_18px_44px_-28px_rgba(0,0,0,0.55)]">
        <div className="flex items-start gap-3">
          <CompanyMark job={job} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-[#5c635f]">{job.company}</p>
            <h3 className="mt-0.5 font-serif text-lg leading-tight">{job.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#5c635f]">
              <MapPin className="size-3" />
              {job.place}
            </p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#8f4326]">
              {job.onAtelier ? 'On Atelier' : 'You apply on their site'}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${
              excellent ? 'bg-[#e6f3ea] text-[#1c5c3a]' : recommended ? 'bg-[#ece9e2] text-[#3d4541]' : 'bg-[#f6ebe4] text-[#8f4326]'
            }`}
          >
            {job.score}/100
          </span>
        </div>
        <Link
          to="/register"
          className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-full bg-[var(--copper)] text-sm font-medium text-[var(--paper)]"
        >
          {applyCta(job)}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </article>
    )
  }

  return (
    <article className="rounded-[1.5rem] border border-[#e7e1d4] bg-[#f7f4ee] p-5 text-[#161c19] shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CompanyMark job={job} />
          <div className="min-w-0">
            <p className="text-sm text-[#5c635f]">{job.company}</p>
            <h3 className="mt-0.5 font-serif text-2xl leading-tight">{job.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5c635f]">
              <Briefcase className="size-3.5" />
              {job.place}
            </p>
          </div>
        </div>
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl font-serif text-xl ${
            excellent ? 'bg-[#e6f3ea] text-[#1c5c3a]' : 'bg-[#f6ebe4] text-[#8f4326]'
          }`}
        >
          {job.score}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[#3d4541]">{job.why}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-[#3d4541]">
        {job.points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-[#1c5c3a]" />
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {excellent ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f3ea] px-2.5 py-1 text-xs text-[#1c5c3a]">
            <Sparkles className="size-3" />
            Recommended
          </span>
        ) : recommended ? (
          <span className="rounded-full bg-[#ece9e2] px-2.5 py-1 text-xs">Near the 70% bar</span>
        ) : (
          <span className="rounded-full bg-[#f6ebe4] px-2.5 py-1 text-xs text-[#8f4326]">Below the 70% bar</span>
        )}
        <span className="rounded-full bg-[#ece9e2] px-2.5 py-1 text-xs">
          {job.onAtelier ? 'Send on Atelier' : 'You apply on their listing'}
        </span>
      </div>
      <Link
        to="/register"
        className="mt-4 flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--copper)] text-sm font-medium text-[var(--paper)]"
      >
        {applyCta(job)}
        <ArrowUpRight className="size-4" />
      </Link>
    </article>
  )
}

export function RisingFitFeed() {
  const loop = [...SAMPLE_FITS, ...SAMPLE_FITS]
  return (
    <div className="relative h-[540px] overflow-hidden rounded-[1.75rem] border border-[#c9c0ae28] bg-[#0d1b16]/80 sm:h-[620px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#0d1b16] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#0d1b16] to-transparent" />
      <div className="atelier-rise space-y-3 p-4">
        {loop.map((job, i) => (
          <FitCard key={`${job.title}-${i}`} job={job} compact />
        ))}
      </div>
      <div className="absolute inset-x-4 bottom-5 z-20 sm:inset-x-6">
        <Link
          to="/register"
          className="block rounded-2xl border border-[#c6a15b55] bg-[#13261f]/95 p-4 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)] backdrop-blur-sm"
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Packet ready</p>
          <p className="mt-1 font-serif text-xl text-[var(--paper)]">Atelier Labs · Full Stack Engineer</p>
          <p className="mt-1 text-sm text-[#c9c0ae]">Employer is on Atelier. Approve and we deliver the packet to their inbox — we never submit to LinkedIn or Upwork.</p>
        </Link>
      </div>
    </div>
  )
}

export function SourceTicker() {
  const loop = [...WORKSHOP_SOURCES, ...WORKSHOP_SOURCES]
  return (
    <div className="overflow-hidden border-y border-[#c9c0ae18]">
      <p className="atelier-ticker flex w-max gap-10 py-3 pr-10 text-[0.72rem] uppercase tracking-[0.16em] text-[#c9c0ae]">
        {loop.map((name, i) => (
          <span key={`${name}-${i}`} className="shrink-0">
            {name}
          </span>
        ))}
      </p>
    </div>
  )
}

export function AloneVsWorkshop() {
  return (
    <section id="features" className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow text-[#c6a15b]">Why the workshop</p>
        <h2 className="mt-3 max-w-[18ch] text-3xl sm:text-5xl">Fewer tabs. Better-fit listings. You still send it.</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-[#c9c0ae22] bg-[#0d1b16]/50 p-7">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9a9386]">Doing it alone</p>
            <ul className="mt-5 space-y-3 text-sm text-[#c9c0ae]">
              {[
                'Nightly scrolling across boards that do not talk to each other',
                'Rewriting the same letter for every posting',
                'Guessing whether a role even matches your salary or stack',
                'Losing replies in a mix of email and tabs',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <X className="mt-0.5 size-4 shrink-0 text-[#b85c38]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.75rem] border border-[#c6a15b44] bg-[#1f3d32]/80 p-7">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">With Atelier</p>
            <ul className="mt-5 space-y-3 text-sm text-[#e7e1d4]">
              {[
                'Authorized APIs, career pages, and roles posted on Atelier — scored in one feed',
                'A packet drafted from your real resume. You edit before anything leaves',
                'A 0–100 score against title, skills, pay, and place — not invented keywords',
                'Applications, follow-ups, and interviews in one workshop',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#c6a15b]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-sm text-[#9a9386]">
          You can apply to any match. Atelier only delivers a packet to employers who posted on Atelier. For LinkedIn, Upwork, Indeed, and similar sites, we prepare the materials — you submit on their official page.
        </p>
      </div>
    </section>
  )
}

export function HowWorkshopWorks({
  steps,
}: {
  steps: [string, string, string][]
}) {
  const cols =
    steps.length === 3 ? 'md:grid-cols-3' : steps.length === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'
  return (
    <ol className={`mt-10 grid gap-6 ${cols}`}>
      {steps.map(([n, title, body]) => (
        <li key={n} className="rounded-[1.75rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 p-6">
          <p className="font-serif text-4xl text-[#c6a15b]">{n}</p>
          <h3 className="mt-4 text-2xl">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#c9c0ae]">{body}</p>
        </li>
      ))}
    </ol>
  )
}

export function FitRow({ job }: { job: Fit }) {
  const excellent = job.score >= 90
  return (
    <Link
      to="/register"
      className="flex items-center gap-3 rounded-2xl border border-[#e7e1d4] bg-[#f7f4ee] p-3 text-[#161c19] transition-colors hover:border-[#c6a15b]"
    >
      <CompanyMark job={job} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{job.title}</p>
        <p className="truncate text-xs text-[#5c635f]">
          {job.company} · {job.onAtelier ? 'Send on Atelier' : 'You apply on their site'}
        </p>
      </div>
      <span className={`shrink-0 text-sm font-semibold ${excellent ? 'text-[#1c5c3a]' : 'text-[#8f4326]'}`}>
        {job.score}/100
      </span>
    </Link>
  )
}

export function MatchScoreBoard() {
  const jobs = SAMPLE_FITS.filter((job) => job.score >= 70)
  return (
    <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Sample fits</p>
        {jobs.map((job) => (
          <FitRow key={job.title} job={job} />
        ))}
      </div>
      <MatchBreakdown />
    </div>
  )
}

export function MatchBreakdown() {
  const bars = [
    ['Skills', 96],
    ['Title', 94],
    ['Location', 92],
    ['Salary', 88],
    ['Seniority', 90],
    ['Goals', 91],
  ] as const

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#c9c0ae22] bg-[#f7f4ee] p-6 text-[#161c19] sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#1c5c3a]">Breakdown · Northwind Labs</p>
          <p className="mt-2 font-serif text-3xl">94 / 100 overall</p>
        </div>
        <p className="max-w-xs text-sm text-[#5c635f]">Weighted against a real resume — not a keyword spray.</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {bars.map(([k, v]) => (
          <div key={k}>
            <div className="flex items-center justify-between text-sm">
              <span>{k}</span>
              <span className="font-serif text-lg">{v}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#ece9e2]">
              <div className="h-full rounded-full bg-[#1c5c3a]" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ApplyPaths() {
  return (
    <section id="packet" className="px-5 pb-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow text-[#c6a15b]">How you apply</p>
        <h2 className="mt-3 max-w-[20ch] text-3xl sm:text-5xl">Same packet. Two destinations. Never a bot on another site.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#c9c0ae] sm:text-base">
          You can apply to every match you like. Atelier never auto-applies on LinkedIn, Upwork, Indeed, or Freelancer. We draft. You send — either to an Atelier employer, or yourself on the official listing.
        </p>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-[#c6a15b44] bg-[#1f3d32]/80 p-7">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Employer on Atelier</p>
            <h3 className="mt-3 text-2xl">We deliver the packet</h3>
            <ol className="mt-5 space-y-3 text-sm text-[#e7e1d4]">
              {[
                'Match the role against your resume',
                'Prepare letter, answers, and a resume draft',
                'You approve',
                'Packet lands in their Atelier inbox',
              ].map((item, i) => (
                <li key={item} className="flex gap-3">
                  <span className="font-serif text-[#c6a15b]">{String(i + 1).padStart(2, '0')}</span>
                  {item}
                </li>
              ))}
            </ol>
            <Button variant="paper" className="mt-6" asChild>
              <Link to="/register">Send to an Atelier employer</Link>
            </Button>
          </article>
          <article className="rounded-[1.75rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 p-7">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9a9386]">Job on another site</p>
            <h3 className="mt-3 text-2xl">You apply on their page</h3>
            <ol className="mt-5 space-y-3 text-sm text-[#c9c0ae]">
              {[
                'We still score the listing and draft the packet',
                'You copy or download what you approved',
                'You submit on LinkedIn, Upwork, Indeed, or the career page',
                'Atelier never clicks Apply on those platforms',
              ].map((item, i) => (
                <li key={item} className="flex gap-3">
                  <span className="font-serif text-[#c6a15b]">{String(i + 1).padStart(2, '0')}</span>
                  {item}
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs uppercase tracking-[0.14em] text-[#8f8878]">
              No auto-submit · LinkedIn · Upwork · Indeed · Freelancer
            </p>
            <Button variant="outline" className="mt-6 border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]" asChild>
              <Link to="/register">Prepare & apply yourself</Link>
            </Button>
          </article>
        </div>
      </div>
    </section>
  )
}

export function WorkshopFor() {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow text-[#c6a15b]">Who the workshop is for</p>
        <h2 className="mt-3 max-w-[18ch] text-3xl sm:text-5xl">Built for a search you can keep up after work</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              title: 'You already have a job',
              body: 'Match while you commute. Prepare a packet in a sitting. Send only the roles that clear your bar.',
            },
            {
              title: 'You are changing stacks',
              body: 'Scores show overlap honestly. Stretch roles stay visible — they just do not pretend to be a 94.',
            },
            {
              title: 'You hate spraying applications',
              body: 'No auto-apply on other sites. A letter in your voice — sent to an Atelier employer, or applied by you on their official page.',
            },
          ].map((item) => (
            <Link
              key={item.title}
              to="/register"
              className="rounded-[1.75rem] border border-[#c9c0ae22] bg-[#0d1b16]/70 p-6 transition-colors hover:border-[#c6a15b66]"
            >
              <h3 className="text-2xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#c9c0ae]">{item.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function WorkshopFaq({
  id = 'faq',
  items,
}: {
  id?: string
  items: { q: string; a: string }[]
}) {
  return (
    <section id={id} className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow text-[#c6a15b]">Questions</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">Straight answers</h2>
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-[#c9c0ae22] bg-[#0d1b16]/70 px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg text-[var(--paper)] marker:content-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-5 shrink-0 text-[#c6a15b] transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#c9c0ae]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export const CANDIDATE_FAQ = [
  {
    q: 'Do you auto-apply on LinkedIn, Upwork, or Indeed?',
    a: 'No. We cannot and do not submit applications on those platforms. You can still apply to those jobs: we prepare the packet, you open the official listing and submit it yourself.',
  },
  {
    q: 'When does a packet go to an employer?',
    a: 'Only when the employer posted the role on Atelier and you approve send. Then the packet lands in their inbox. That is the only place Atelier delivers an application for you.',
  },
  {
    q: 'Can I message an employer?',
    a: 'Yes, after you send a packet to an Atelier employer. They can write back from their inbox. Jobs on LinkedIn, Indeed, or Upwork stay on those sites — we do not open a chat there.',
  },
  {
    q: 'Can I still apply to jobs that are not on Atelier?',
    a: 'Yes. Match, prepare, and copy the letter. Then apply on the official URL. We track it in your workshop so replies and interviews stay in one place.',
  },
  {
    q: 'Can I invite that employer to Atelier?',
    a: 'Yes. Every listing from Himalayas, a career page, LinkedIn, or another board has an invite. Send them a join link so they can create a hiring account and receive approved packets here. Atelier jobs already have an inbox — no invite needed.',
  },
  {
    q: 'Where do the jobs come from?',
    a: 'Licensed APIs, public career pages, and roles employers post on Atelier. We do not scrape LinkedIn, Indeed, or Upwork. If a board has no public API, we open their official search so you can apply there.',
  },
  {
    q: 'How is the match score calculated?',
    a: 'Each listing is weighed 0–100 against your real skills, title, experience, salary floor, location, and work mode. Roles under 70% stay out of Recommended. A score is a guide, not a promise of an interview.',
  },
  {
    q: 'Will employers know the packet was drafted with AI?',
    a: 'They see a normal application you approved. You can edit every line. We do not invent skills you did not list.',
  },
  {
    q: 'What is Atelier time tracker?',
    a: 'Atelier time tracker is our official work clock. After an Atelier employer marks you hired, you clock in and out yourself, export a timesheet, or download Atelier-time-tracker.html for your desk. Nothing is captured in the background.',
  },
]
