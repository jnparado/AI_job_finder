import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Copy } from 'lucide-react'
import { employerInviteNote } from '@shared/employerInvite'
import { isStaffRole, sourceLabel } from '@shared/types'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/ui/feedback'
import { MarketingSessionButtons } from '@/components/layout/AccountSession'
import { useAuth } from '@/lib/auth'

export function JoinEmployerPage() {
  const [params] = useSearchParams()
  const { user, profile, loading } = useAuth()
  const [copied, setCopied] = useState('')
  const company = (params.get('company') ?? '').trim() || 'your company'
  const from = params.get('from') ?? ''
  const listing = (params.get('listing') ?? '').trim()
  const platform = from ? sourceLabel(from) : ''
  const registerParams = new URLSearchParams(params)
  registerParams.set('role', 'employer')
  const registerTo = `/register?${registerParams.toString()}`
  const hiringHere = Boolean(user && (profile.role === 'employer' || isStaffRole(profile.role)))
  const candidateHere = Boolean(user && !hiringHere)

  function copy(kind: 'link' | 'note') {
    const job = { company, title: listing || 'a role', source: from || 'feed' }
    const text = kind === 'link' ? window.location.href : employerInviteNote(job)
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(kind)
      window.setTimeout(() => setCopied(''), 2000)
    })
  }

  return (
    <div className="min-h-svh bg-[var(--forest)] text-[var(--paper)]">
      <div className="mx-auto flex max-w-xl items-center justify-between px-5 pt-6">
        <BrandMark light />
        <MarketingSessionButtons hiring />
      </div>
      <div className="mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-xl flex-col justify-center px-5 py-16">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#c6a15b]">
          Employer invite
        </p>
        <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-5xl">
          {company} is invited to hire on Atelier
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#d8d0c0]">
          {listing
            ? `A candidate matched ${listing}${platform ? ` on ${platform}` : ''}.`
            : 'A candidate on Atelier matched one of your listings.'}{' '}
          Create a free hiring account. Approved packets land in your inbox — nothing is sent until the candidate
          says yes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {loading ? null : hiringHere ? (
            <Button variant="copper" size="lg" asChild>
              <Link to="/employer">Open hiring desk</Link>
            </Button>
          ) : candidateHere ? (
            <Button variant="copper" size="lg" type="button" onClick={() => copy('link')}>
              <Copy className="size-4" />
              {copied === 'link' ? 'Copied' : 'Copy join link for them'}
            </Button>
          ) : (
            <Button variant="copper" size="lg" asChild>
              <Link to={registerTo}>Create employer account</Link>
            </Button>
          )}
          {hiringHere || candidateHere ? null : (
            <Button
              variant="outline"
              size="lg"
              className="border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]"
              asChild
            >
              <Link to="/login?role=employer">I already hire here</Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            className="border-[#c9c0ae55] text-[var(--paper)] hover:bg-[#1f3d32]"
            type="button"
            onClick={() => copy(candidateHere ? 'note' : 'link')}
          >
            <Copy className="size-4" />
            {copied ? 'Copied' : candidateHere ? 'Copy invite note' : 'Copy join link'}
          </Button>
        </div>
        {candidateHere ? (
          <p className="mt-6 text-sm text-[#c9c0ae]">
            You are signed in as a candidate. Send this page to {company} so they can create their own hiring
            account.
          </p>
        ) : (
          <p className="mt-6 text-sm text-[#c9c0ae]">
            Hiring is free for the first year. After that, the Hiring plan is billed yearly.
          </p>
        )}
      </div>
    </div>
  )
}
