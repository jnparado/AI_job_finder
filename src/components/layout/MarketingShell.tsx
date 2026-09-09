import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/ui/feedback'
import { SocialFollow } from '@/components/social/SocialLinks'
import { filmLocal, filmSrc } from '@/lib/films'

export function MarketingShell({
  audience,
  children,
}: {
  audience?: 'candidate' | 'employer'
  children: ReactNode
}) {
  const registerTo = audience === 'employer' ? '/register?role=employer' : '/register'
  const hiring = audience === 'employer'

  return (
    <div className="marketing-shell min-h-svh text-[var(--paper)]">
      <div className="h-0.5 bg-[#c6a15b]" />
      <header className="sticky top-0 z-30 border-b border-[#c9c0ae14] bg-[var(--forest)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link to={hiring ? '/employers' : '/'} className="shrink-0">
            <BrandMark light />
          </Link>

          {audience ? (
            <div className="flex items-center rounded-full border border-[#c9c0ae33] p-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
              <Link
                to="/"
                className={`rounded-full px-3 py-1.5 ${
                  !hiring
                    ? 'bg-[var(--paper)] !text-[#13261f]'
                    : '!text-[#d8d0c0] hover:!text-[var(--paper)]'
                }`}
              >
                Candidates
              </Link>
              <Link
                to="/employers"
                className={`rounded-full px-3 py-1.5 ${
                  hiring
                    ? 'bg-[var(--paper)] !text-[#13261f]'
                    : '!text-[#d8d0c0] hover:!text-[var(--paper)]'
                }`}
              >
                Employers
              </Link>
            </div>
          ) : (
            <nav className="order-3 flex w-full items-center justify-center gap-1 text-sm sm:order-0 sm:w-auto">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition-colors ${isActive ? 'bg-[#1f3d32] text-white' : 'text-[#d8d0c0] hover:bg-[#1f3d32]/70'}`
                }
              >
                Candidates
              </NavLink>
              <NavLink
                to="/employers"
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition-colors ${isActive ? 'bg-[#1f3d32] text-white' : 'text-[#d8d0c0] hover:bg-[#1f3d32]/70'}`
                }
              >
                Employers
              </NavLink>
            </nav>
          )}

          {audience ? (
            <>
              <nav className="hidden items-center gap-5 text-sm text-[#d8d0c0] lg:flex">
                <HashNav hiring={hiring} />
              </nav>
            </>
          ) : null}

          <div className="flex shrink-0 gap-2">
            <Button variant="outline" className="border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]" asChild>
              <Link to={hiring ? '/login?role=employer' : '/login'}>Log in</Link>
            </Button>
            <Button variant={hiring ? 'paper' : 'copper'} asChild>
              <Link to={registerTo}>Sign up</Link>
            </Button>
          </div>
        </div>
        {audience ? (
          <nav className="flex gap-5 overflow-x-auto border-t border-[#c9c0ae14] px-5 py-2.5 text-sm text-[#d8d0c0] sm:px-8 lg:hidden">
            <HashNav hiring={hiring} />
          </nav>
        ) : null}
      </header>
      {children}
      <MarketingFooter />
    </div>
  )
}

function HashNav({ hiring }: { hiring: boolean }) {
  const links = hiring
    ? [
        ['Features', '/employers#features'],
        ['How it works', '/employers#how'],
        ['Inbox', '/employers#inbox'],
        ['FAQ', '/employers#faq'],
      ]
    : [
        ['Features', '/#features'],
        ['How it works', '/#how'],
        ['Matches', '/#matches'],
        ['FAQ', '/#faq'],
      ]
  return (
    <>
      {links.map(([label, to]) => (
        <Link key={label} to={to} className="shrink-0 hover:text-[var(--paper)]">
          {label}
        </Link>
      ))}
    </>
  )
}

const FOOTER_COLS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { to: '/', label: 'Candidates' },
      { to: '/employers', label: 'Employers' },
      { to: '/register', label: 'Get started' },
      { to: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Applicants',
    links: [
      { to: '/register', label: 'Find a job' },
      { to: '/#how', label: 'How it works' },
      { to: '/#matches', label: 'Match scores' },
      { to: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Employers',
    links: [
      { to: '/register?role=employer', label: 'Post a role' },
      { to: '/employers#how', label: 'How it works' },
      { to: '/employers#inbox', label: 'Inbox' },
      { to: '/employers#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/support', label: 'Support' },
      { to: '/', label: 'Home' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/support', label: 'Help Center' },
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Use' },
    ],
  },
]

function MarketingFooter() {
  return (
    <footer className="mt-8 bg-[#0a100e] px-5 pt-14 pb-8 sm:px-8 sm:pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="max-w-xs shrink-0">
            <Link to="/" className="inline-block">
              <BrandMark light />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[#9a9386]">
              The workshop for jobs that fit. Authorized boards. Honest scores. Nothing sent until you approve.
            </p>
            <div className="mt-6">
              <SocialFollow light omit={['facebook']} />
            </div>
          </div>

          <nav aria-label="Footer" className="grid flex-1 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-[var(--paper)]">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={`${col.title}-${link.label}`}>
                      <Link
                        to={link.to}
                        className="text-sm text-[#9a9386] transition-colors hover:text-[var(--paper)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[#c9c0ae22] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#9a9386]">
              © {new Date().getFullYear()} Atelier, AI-Powered Job Matching. All rights reserved.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#6f6a60]">
              An independent product — not affiliated with other companies named Atelier.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#9a9386]">
            <Link to="/privacy" className="hover:text-[var(--paper)]">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[var(--paper)]">
              Terms of Use
            </Link>
            <Link to="/support" className="hover:text-[var(--paper)]">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function MarketingVideo({
  file,
  poster,
  className,
}: {
  file: string
  poster?: string
  className: string
}) {
  const remote = filmSrc(file)
  const local = filmLocal(file)
  const remotePoster = poster ? filmSrc(poster) : undefined
  const localPoster = poster ? filmLocal(poster) : undefined
  const [video, setVideo] = useState(remote)
  const [shot, setShot] = useState(remotePoster)

  return (
    <video
      className={className}
      controls
      playsInline
      preload="auto"
      poster={shot}
      src={video}
      onError={() => {
        if (video !== local) setVideo(local)
        if (shot && localPoster && shot !== localPoster) setShot(localPoster)
      }}
    />
  )
}

export function LandingVideo({
  src,
  poster,
  title,
  kicker,
  caption,
}: {
  src: string
  poster: string
  title: string
  kicker: string
  caption: string
}) {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-[#c6a15b]">{kicker}</p>
          <h2 className="mt-3 text-3xl text-[var(--paper)] sm:text-4xl">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#c9c0ae] sm:text-base">{caption}</p>
        </div>
        <div className="relative mx-auto mt-10 rounded-[1.75rem] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] [transform:translateZ(0)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px rounded-t-[1.75rem] bg-gradient-to-r from-transparent via-[#c6a15b66] to-transparent" />
          <MarketingVideo
            file={src}
            poster={poster}
            className="atelier-player aspect-video w-full rounded-[1.75rem] border border-[#c9c0ae28]"
          />
        </div>
      </div>
    </section>
  )
}

export function SocialAdKit({ audience }: { audience: 'candidate' | 'employer' }) {
  const isEmployer = audience === 'employer'
  const vertical = isEmployer ? 'atelier-ad-shorts-employer.mp4' : 'atelier-ad-shorts-candidate.mp4'
  const poster = isEmployer ? 'atelier-ad-v-hire-01.png' : 'atelier-ad-v-cand-01.png'
  const page = isEmployer ? 'atelier-fb-page-employer.mp4' : 'atelier-fb-page-candidate.mp4'
  const feed45 = isEmployer ? 'atelier-fb-feed-4x5-employer.mp4' : 'atelier-fb-feed-4x5-candidate.mp4'
  const reels = isEmployer ? 'atelier-fb-reels-employer.mp4' : 'atelier-fb-reels-candidate.mp4'
  const wide = isEmployer ? 'atelier-ad-employer.mp4' : 'atelier-ad-candidate.mp4'
  const cuts = [
    { href: filmSrc(page), label: 'Facebook Page video', note: '16:9 · 15s' },
    { href: filmSrc('atelier-fb-feed.mp4'), label: 'Facebook feed square', note: '1:1 · 15s' },
    { href: filmSrc(feed45), label: 'Facebook / Instagram feed', note: '4:5 · 15s' },
    { href: filmSrc(reels), label: 'Facebook Reels & Stories', note: '9:16 · 15s' },
    { href: filmSrc(wide), label: 'YouTube / LinkedIn in-stream', note: '16:9' },
    { href: filmSrc('atelier-ad-bumper-6s.mp4'), label: 'YouTube bumper', note: '16:9 · 6s' },
  ]

  return (
    <section className="px-5 pb-16 sm:px-8 sm:pb-20">
      <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[0.42fr_1.58fr]">
        <div className="mx-auto w-full max-w-[22rem]">
          <div className="rounded-[1.75rem] [transform:translateZ(0)]">
            <MarketingVideo
              file={vertical}
              poster={poster}
              className="atelier-player aspect-[9/16] w-full rounded-[1.75rem] border border-[#c9c0ae28]"
            />
          </div>
        </div>
        <div>
          <p className="eyebrow text-[#c6a15b]">Facebook Page ads</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl sm:text-4xl">Cuts ready for Page posts, Reels, and feed</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#c9c0ae] sm:text-base">
            Same story as the film, sized for each placement. Download the MP4, paste the caption from the copy sheet, and point the ad to sign-up. Swap the quiet tone bed for licensed music before you spend.
          </p>
          <ul className="mt-8 space-y-3">
            {cuts.map((cut) => (
              <li key={cut.href}>
                <a
                  href={cut.href}
                  download
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#c9c0ae22] bg-[#0d1b16]/70 px-4 py-3 transition-colors hover:border-[#c6a15b55]"
                >
                  <span>
                    <span className="block font-medium">{cut.label}</span>
                    <span className="text-sm text-[#c9c0ae]">{cut.note}</span>
                  </span>
                  <span className="text-sm text-[var(--copper)]">Download</span>
                </a>
              </li>
            ))}
          </ul>
          <a href={filmSrc('social-copy.txt')} className="mt-4 inline-block text-sm text-[#c6a15b] hover:text-[var(--paper)]">
            Ad captions (Meta, YouTube, LinkedIn)
          </a>
        </div>
      </div>
    </section>
  )
}
