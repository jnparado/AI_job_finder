import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker ? <p className="eyebrow">{kicker}</p> : null}
        <h1 className="mt-1 text-3xl sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  actionLabel,
  to,
  onClick,
}: {
  title: string
  body: string
  actionLabel?: string
  to?: string
  onClick?: () => void
}) {
  return (
    <Card className="py-12 text-center">
      <h2 className="text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{body}</p>
      {actionLabel && to ? (
        <Button className="mt-6" variant="copper" asChild>
          <Link to={to}>{actionLabel}</Link>
        </Button>
      ) : null}
      {actionLabel && onClick ? (
        <Button className="mt-6" variant="copper" onClick={onClick}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  )
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-svh place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/brand/atelier-logo.jpg"
        alt=""
        width={40}
        height={40}
        className="size-10 rounded-xl object-cover shadow-[0_0_0_1px_rgba(198,161,91,0.28)]"
      />
      <div>
        <div className={`font-serif text-lg leading-none ${light ? 'text-[var(--paper)]' : ''}`}>Atelier</div>
        <div
          className={`mt-1 text-[0.58rem] uppercase tracking-[0.1em] ${light ? 'text-[#c9c0ae]' : 'text-muted-foreground'}`}
        >
          AI-Powered Job Matching
        </div>
      </div>
    </div>
  )
}
