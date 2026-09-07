import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/ui/feedback'

export function MarketingShell({
  audience,
  children,
}: {
  audience?: 'candidate' | 'employer'
  children: ReactNode
}) {
  const registerTo = audience === 'employer' ? '/register?role=employer' : '/register'
  return (
    <div className="min-h-svh bg-[var(--forest)] text-[var(--paper)]">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link to="/">
          <BrandMark light />
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <NavLink
            to="/candidates"
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 ${isActive ? 'bg-[#1f3d32] text-white' : 'text-[#d8d0c0] hover:bg-[#1f3d32]/70'}`
            }
          >
            Candidates
          </NavLink>
          <NavLink
            to="/employers"
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 ${isActive ? 'bg-[#1f3d32] text-white' : 'text-[#d8d0c0] hover:bg-[#1f3d32]/70'}`
            }
          >
            Employers
          </NavLink>
        </nav>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#c9c0ae55] text-[var(--paper)]" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button variant="copper" asChild>
            <Link to={registerTo}>{audience === 'employer' ? 'Post a job' : 'Get started'}</Link>
          </Button>
        </div>
      </header>
      {children}
    </div>
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
    <section className="border-t border-[#c9c0ae22] px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow text-center text-[#c6a15b]">{kicker}</p>
        <h2 className="mt-3 text-center text-3xl text-[var(--paper)] sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-[#c9c0ae]">{caption}</p>
        <div className="mx-auto mt-8 overflow-hidden rounded-3xl border border-[#c9c0ae33] bg-[#0d1b16]">
          <video
            className="aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            poster={poster}
            src={src}
          />
        </div>
        <p className="mt-4 text-center text-sm">
          <a href={src} download className="text-[#c6a15b] underline-offset-4 hover:underline">
            Download this ad
          </a>
        </p>
      </div>
    </section>
  )
}
