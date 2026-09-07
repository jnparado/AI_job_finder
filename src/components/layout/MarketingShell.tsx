import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/ui/feedback'
import { SocialFollow } from '@/components/social/SocialLinks'

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
          <Link to="/" className="shrink-0">
            <BrandMark light />
          </Link>

          {audience ? (
            <div className="flex items-center rounded-full border border-[#c9c0ae33] p-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
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
              <Link
                to="/candidates"
                className={`rounded-full px-3 py-1.5 ${
                  !hiring
                    ? 'bg-[var(--paper)] !text-[#13261f]'
                    : '!text-[#d8d0c0] hover:!text-[var(--paper)]'
                }`}
              >
                Candidates
              </Link>
            </div>
          ) : (
            <nav className="order-3 flex w-full items-center justify-center gap-1 text-sm sm:order-0 sm:w-auto">
              <NavLink
                to="/candidates"
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
            <nav className="hidden items-center gap-5 text-sm text-[#d8d0c0] lg:flex">
              <a href="#platform" className="hover:text-[var(--paper)]">
                Platform
              </a>
              <a href="#help" className="hover:text-[var(--paper)]">
                How we help
              </a>
              <a href="#serve" className="hover:text-[var(--paper)]">
                Who we serve
              </a>
            </nav>
          ) : null}

          <div className="flex shrink-0 gap-2">
            <Button variant="outline" className="border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]" asChild>
              <Link to="/login">{hiring ? 'Login' : 'Sign in'}</Link>
            </Button>
            <Button variant={hiring ? 'paper' : 'copper'} asChild>
              <Link to={registerTo}>{hiring ? 'Signup' : audience === 'candidate' ? 'Get started' : 'Get started'}</Link>
            </Button>
          </div>
        </div>
      </header>
      {children}
      <MarketingFooter />
    </div>
  )
}

const FOOTER_COLS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { to: '/candidates', label: 'Candidates' },
      { to: '/employers', label: 'Employers' },
      { to: '/register', label: 'Get started' },
      { to: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Applicants',
    links: [
      { to: '/register', label: 'Find a job' },
      { to: '/candidates#help', label: 'How we help' },
      { to: '/candidates#serve', label: 'Who we serve' },
      { to: '/login', label: 'I have an account' },
    ],
  },
  {
    title: 'Employers',
    links: [
      { to: '/register?role=employer', label: 'Post a role' },
      { to: '/employers#help', label: 'How we help' },
      { to: '/employers#serve', label: 'Who we serve' },
      { to: '/register?role=employer', label: 'Review packets' },
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
              © {new Date().getFullYear()} Atelier, AI Job Assistant. All rights reserved.
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
        <div className="relative mx-auto mt-10 overflow-hidden rounded-[1.75rem] border border-[#c9c0ae28] bg-[#0d1b16] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#c6a15b66] to-transparent" />
          <video
            className="aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            poster={poster}
            src={src}
          />
        </div>
      </div>
    </section>
  )
}
