import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MarketingShell } from '@/components/layout/MarketingShell'

function Doc({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="eyebrow text-[#c6a15b]">Atelier</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
        {updated ? <p className="mt-3 text-sm text-[#9a9386]">Last updated {updated}</p> : null}
        <div className="legal-copy mt-8 space-y-4 text-sm leading-relaxed text-[#c9c0ae] sm:text-base [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-[var(--paper)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
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
        <Link to="/" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Employers
        </Link>
      </p>
    </Doc>
  )
}

export function PrivacyPage() {
  return (
    <Doc title="Privacy Policy" updated="8 September 2026">
      <p>
        This policy explains how Atelier, an independent AI job assistant at{' '}
        <a href="https://ai-job-finder-ecru.vercel.app/" className="text-[#c6a15b] hover:text-[var(--paper)]">
          ai-job-finder-ecru.vercel.app
        </a>
        , collects and uses information when you visit the site, create an account, or use the workshop. Atelier is not affiliated with other companies named Atelier.
      </p>

      <h2>Who this covers</h2>
      <p>
        Candidates use Atelier to match against authorized listings, prepare an application packet, and send it only after they approve it. Employers use Atelier to post roles and review those packets. Visitors who only read the marketing pages are covered too.
      </p>

      <h2>Information we collect</h2>
      <p>We collect what you give us and what is needed to run the service:</p>
      <ul>
        <li>Account details — name, email, password or social login, and whether you are a candidate or employer.</li>
        <li>Profile and resume — title, skills, location, salary range, work preferences, and any file you upload so we can score listings and draft a packet.</li>
        <li>Applications you approve — the packet, answers, and status after you send it. Employers see a packet only after you send it.</li>
        <li>Employer posts — company, role, and listing details you publish.</li>
        <li>Usage — pages viewed, search queries, and device or browser information that hosting and analytics need to keep the site working.</li>
      </ul>
      <p>We do not ask for payment card numbers on Atelier itself. Card and wallet checkout, when you use it, is handled by the payment provider.</p>

      <h2>How we use it</h2>
      <ul>
        <li>Create and secure your account.</li>
        <li>Score authorized job listings against your real profile — not invented skills.</li>
        <li>Prepare cover letters and answers for you to review. Nothing is sent to an employer or job board until you approve it. We do not auto-apply.</li>
        <li>Show employers the packets you send, and let them move those applications through their inbox.</li>
        <li>Improve the product, prevent abuse, and send account or product messages you would expect.</li>
      </ul>

      <h2>Job search and third parties</h2>
      <p>
        Listings come from authorized APIs, public career pages, and roles posted on Atelier. We do not scrape LinkedIn, Indeed, or Upwork. When you search, we may send a job title, location, and similar filters to those licensed sources so they can return listings. We do not sell your profile.
      </p>
      <p>
        Login and data storage run through our hosting and authentication provider. If you sign in with Google, Facebook, or Apple, that provider shares the account information you allow. Optional analytics and advertising tags (for example Google or Meta) may run when those IDs are configured.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies and similar storage to keep you signed in, remember a login email if you ask us to, and measure how the site is used. You can block cookies in your browser. Some features, including sign-in, will not work without them.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep account, profile, and application records while you use Atelier. You can update them in the workshop. If you delete your account or ask us to remove your data, we delete or anonymize what we no longer need, unless the law requires us to keep a record.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit your profile, resume, and account from Settings.</li>
        <li>Choose which packets to send. An employer does not see a draft you never approve.</li>
        <li>Ask for a copy of your data, a correction, or deletion from{' '}
          <Link to="/support" className="text-[#c6a15b] hover:text-[var(--paper)]">
            Support
          </Link>
          .
        </li>
      </ul>
      <p>If you are in a region with extra privacy rights, we will honor a valid request through Support.</p>

      <h2>Children</h2>
      <p>Atelier is for people looking for work and for hiring teams. It is not directed at children under 16. We do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>
        We may update this policy as the product changes. The date at the top will change when we do. Continued use after an update means you accept the new policy.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions go to{' '}
        <Link to="/support" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Support
        </Link>
        . You can also review our{' '}
        <Link to="/terms" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Terms of Use
        </Link>
        .
      </p>
    </Doc>
  )
}

export function TermsPage() {
  return (
    <Doc title="Terms of Use" updated="8 September 2026">
      <p>
        These terms govern your use of Atelier, an independent AI job assistant at{' '}
        <a href="https://ai-job-finder-ecru.vercel.app/" className="text-[#c6a15b] hover:text-[var(--paper)]">
          ai-job-finder-ecru.vercel.app
        </a>
        . By creating an account or using the site, you agree to them. If you do not agree, do not use the service. Atelier is not affiliated with other companies named Atelier.
      </p>

      <h2>The service</h2>
      <p>
        Candidates match against authorized listings, prepare an application packet, and send it only after they approve it. Employers post a role and review those packets. We score listings against a real profile — not invented skills.
      </p>
      <p>
        We do not scrape LinkedIn, Indeed, or Upwork. We do not auto-apply. Nothing is sent to an employer or job board until you say so. You apply on the official listing URL or by sending a packet through Atelier.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must provide accurate account details and keep them current.</li>
        <li>You are responsible for activity under your login. Do not share your password.</li>
        <li>One person or company per account, unless we agree otherwise. Do not impersonate someone else.</li>
        <li>We may suspend or close an account that breaks these terms or puts the workshop at risk.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You own your resume, profile, and packets. You grant Atelier a license to store and process them so we can score listings, prepare drafts, and deliver applications you approve. You are responsible for the accuracy of what you upload and what you send.
      </p>
      <p>
        Do not upload material you do not have the right to use. Do not include secrets, other people’s private data, or unlawful content. Employers own the roles they post and are responsible for those listings.
      </p>

      <h2>Job listings</h2>
      <p>
        Listings come from authorized APIs, public career pages, and roles posted on Atelier. Third-party boards set their own rules. We do not control those sites and we do not promise that a listing is still open, accurate, or a fit. A match score is a guide, not a guarantee of an interview or a hire.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not try to scrape, overload, or break the service.</li>
        <li>Do not use Atelier to spam employers or candidates, or to send packets you did not approve.</li>
        <li>Do not use the workshop to discriminate unlawfully or to post fake roles.</li>
        <li>Do not reverse-engineer or resell the product except as the law allows.</li>
      </ul>

      <h2>Plans and payment</h2>
      <p>
        Some features may require a paid plan. Prices and what is included are shown at checkout. Fees billed by Stripe or PayPal are handled by those providers. Taxes may apply. We may change plans with notice. Unless the law requires otherwise, fees are not refunded after a period has started.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Atelier, the workshop interface, and our marks are ours. You may not copy or brand the product as your own. Feedback you send may be used to improve the service without an obligation to you.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The service is provided as-is. We do not promise uninterrupted access, error-free drafts, or that using Atelier will get you a job or a hire. To the fullest extent the law allows, we are not liable for lost opportunity, lost data, or indirect damages arising from the service or from third-party boards.
      </p>

      <h2>Privacy</h2>
      <p>
        How we collect and use information is described in the{' '}
        <Link to="/privacy" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Privacy Policy
        </Link>
        . That policy is part of these terms.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms as the product changes. The date at the top will change when we do. Continued use after an update means you accept the new terms. Questions go to{' '}
        <Link to="/support" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Support
        </Link>
        .
      </p>
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
          <Link to="/" className="text-[#c6a15b] hover:text-[var(--paper)]">
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
      <p>
        For privacy questions, see the{' '}
        <Link to="/privacy" className="text-[#c6a15b] hover:text-[var(--paper)]">
          Privacy Policy
        </Link>
        . We will add a support inbox as the workshop grows.
      </p>
    </Doc>
  )
}
