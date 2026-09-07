import { Link } from 'react-router-dom'
import { Check, Search, FilePen, Send, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/ui/feedback'

const FEATURES = [
  { title: 'Search that never sleeps', body: 'Authorized job APIs, career pages, and feeds — not a noisy board.' },
  { title: 'Scores you can trust', body: 'Skills, experience, salary, location, and goals, explained in plain language.' },
  { title: 'Apply without fabricating', body: 'Tailored resume, cover letter, and answers from your real profile.' },
  { title: 'You stay in control', body: 'Nothing is submitted or messaged until you approve the packet.' },
]

const STEPS = [
  { icon: Search, label: 'Discover' },
  { icon: Check, label: 'Match' },
  { icon: FilePen, label: 'Prepare' },
  { icon: ShieldCheck, label: 'Approve' },
  { icon: Send, label: 'Track' },
]

export function LandingPage() {
  return (
    <div className="min-h-svh bg-[var(--forest)] text-[var(--paper)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandMark light />
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#c9c0ae55] text-[var(--paper)]" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button variant="copper" asChild>
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          <p className="eyebrow">Your AI career agent</p>
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

        <div className="rounded-3xl border border-[#c9c0ae33] bg-[#0d1b16] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">How a role reaches you</p>
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.label} className="flex items-center gap-4">
                <span className="grid size-10 place-items-center rounded-full border border-[#c9c0ae33]">
                  <step.icon className="size-4" />
                </span>
                <div>
                  <div className="text-xs text-[#c9c0ae]">Step {i + 1}</div>
                  <div className="font-medium">{step.label}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-[#c9c0ae22]">
        <ul className="mx-auto grid max-w-6xl gap-px bg-[#c9c0ae22] sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="bg-[var(--forest)] px-6 py-8 sm:px-8">
              <h2 className="text-xl text-[var(--paper)]">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#c9c0ae]">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
