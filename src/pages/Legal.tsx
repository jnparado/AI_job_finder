import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MarketingShell } from '@/components/layout/MarketingShell'

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="eyebrow text-[#c6a15b]">Atelier</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-[#c9c0ae] sm:text-base">{children}</div>
      </article>
    </MarketingShell>
  )
}

export function AboutPage() {
  return (
    <Doc title="About">
      <p>
        Atelier is an AI job assistant. Candidates match against authorized listings, prepare an application, and send it only after they approve the packet. Employers post a role and review those packets.
      </p>
      <p>
        We do not scrape LinkedIn, Indeed, or Upwork. We do not auto-apply. Scores are weighed against a real profile — not invented skills.
      </p>
      <p>Atelier is an independent product, not affiliated with other companies named Atelier.</p>
      <p>
        <Link to="/register" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Get started free
        </Link>
        {' · '}
        <Link to="/candidates" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Candidates
        </Link>
        {' · '}
        <Link to="/employers" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Employers
        </Link>
      </p>
    </Doc>
  )
}

export function PrivacyPage() {
  return (
    <Doc title="Privacy Policy">
      <p>Last updated {new Date().getFullYear()}.</p>
      <p>
        We collect the account, resume, and profile details you give us so we can score listings, prepare packets, and track applications you approve. Employers see a packet only after you send it.
      </p>
      <p>
        We do not sell your profile. Hosting and auth run through our database and login provider. You can update or delete information from your account settings, or write us from Support.
      </p>
      <p>
        <Link to="/support" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Contact support
        </Link>
      </p>
    </Doc>
  )
}

export function TermsPage() {
  return (
    <Doc title="Terms of Use">
      <p>Last updated {new Date().getFullYear()}.</p>
      <p>
        Atelier is a workshop for matching and applying. You are responsible for the accuracy of your resume and the packets you approve. Nothing is sent to an employer or board until you say so.
      </p>
      <p>
        Listings come from authorized APIs, career pages, and roles posted on Atelier. We do not promise a hire. The service is provided as-is, and we may update these terms as the product changes.
      </p>
      <p>Atelier, AI Job Assistant, is an independent product — not affiliated with other companies named Atelier.</p>
    </Doc>
  )
}

export function SupportPage() {
  return (
    <Doc title="Support">
      <p>Need help matching, preparing a packet, or posting a role? Start here.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Applicants:{' '}
          <Link to="/candidates" className="text-[#c6a15b] hover:text-[var(--paper)]">
            how Atelier works
          </Link>
          , then sign in to your dashboard.
        </li>
        <li>
          Employers:{' '}
          <Link to="/employers" className="text-[#c6a15b] hover:text-[var(--paper)]">
            posting and packets
          </Link>
          .
        </li>
        <li>
          Account access:{' '}
          <Link to="/login" className="text-[#c6a15b] hover:text-[var(--paper)]">
            sign in
          </Link>{' '}
          or{' '}
          <Link to="/register" className="text-[#c6a15b] hover:text-[var(--paper)]">
            create an account
          </Link>
          .
        </li>
      </ul>
      <p>For privacy questions, see the Privacy Policy. We will add a support inbox as the workshop grows.</p>
    </Doc>
  )
}
