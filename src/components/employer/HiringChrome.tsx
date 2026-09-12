import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, Check, Inbox, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { localBrandPath } from '@/lib/brandAssets'

export function HiringHero({
  kicker,
  title,
  description,
  actions,
  image = 'employer-hero.jpg',
  imageAlt = 'Hiring desk',
  children,
  compact,
}: {
  kicker: string
  title: ReactNode
  description?: string
  actions?: ReactNode
  image?: string
  imageAlt?: string
  children?: ReactNode
  compact?: boolean
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#c9c0ae33] bg-[var(--forest)] text-[var(--paper)] shadow-[0_16px_40px_rgba(13,27,22,0.14)]">
      <div className={cn('grid', compact ? '' : 'lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]')}>
        <div className={cn('relative z-10', compact ? 'p-4 sm:p-6' : 'p-4 sm:p-6')}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#c6a15b]">{kicker}</p>
          <h1 className={cn('mt-1.5 font-serif leading-[1.08] tracking-[-0.03em]', compact ? 'text-2xl sm:text-3xl' : 'text-2xl sm:text-3xl')}>
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#d8d0c0]">{description}</p>
          ) : null}
          {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {compact ? null : (
          <div className="desk-hero-photo relative hidden h-32 overflow-hidden sm:block lg:h-[10.5rem]">
            <img
              src={localBrandPath(image, 'employer')}
              alt={imageAlt}
              className="h-full w-full object-cover object-[center_30%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--forest)] via-[var(--forest)]/25 to-transparent lg:bg-gradient-to-l lg:via-[var(--forest)]/20" />
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

export function HiringStat({
  n,
  label,
  hint,
}: {
  n: number | string
  label: string
  hint?: string
}) {
  return (
    <div className="bg-[var(--forest-2)] px-4 py-4 sm:px-5 sm:py-5">
      <div className="font-serif text-2xl tabular-nums text-[var(--paper)] sm:text-[1.85rem]">{n}</div>
      <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#c6a15b]">{label}</div>
      {hint ? <p className="mt-1 text-xs text-[#c9c0ae]">{hint}</p> : null}
    </div>
  )
}

export function HowHiringWorks({ className }: { className?: string }) {
  const steps = [
    { n: '01', title: 'Post a role', body: 'Title, stack, and pay. It appears in candidate search.', icon: Briefcase },
    { n: '02', title: 'They approve', body: 'A match drafts a packet. Nothing is sent until they say yes.', icon: Sparkles },
    { n: '03', title: 'Review in inbox', body: 'Letter, resume, and answers land here. Then you can message.', icon: Inbox },
  ]
  return (
    <ol className={cn('grid gap-3 md:grid-cols-3', className)}>
      {steps.map((step) => (
        <li
          key={step.n}
          className="relative overflow-hidden rounded-3xl border border-[#d7ddd8] bg-card p-5 shadow-[0_12px_32px_rgba(19,38,31,0.05)]"
        >
          <span className="font-serif text-3xl text-[#c6a15b]/50">{step.n}</span>
          <step.icon className="absolute right-5 top-5 size-5 text-[var(--forest)]/50" />
          <h3 className="mt-3 font-serif text-xl text-[var(--forest)]">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        </li>
      ))}
    </ol>
  )
}

export function HiringEmpty({
  kicker = 'Atelier',
  title,
  body,
  actionLabel,
  to,
  image = 'employer-inbox.jpg',
  imageAlt = 'Reviewing approved packets',
}: {
  kicker?: string
  title: string
  body: string
  actionLabel?: string
  to?: string
  image?: string
  imageAlt?: string
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#d7ddd8] bg-card shadow-[0_18px_44px_rgba(19,38,31,0.07)] sm:rounded-[2rem]">
      <div className="grid md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="p-6 sm:p-8">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--copper)]">{kicker}</p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-[var(--forest)]">{title}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{body}</p>
          {actionLabel && to ? (
            <Button className="mt-6" variant="copper" asChild>
              <Link to={to}>
                {actionLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="relative min-h-[10rem]">
          <img src={localBrandPath(image, 'employer')} alt={imageAlt} className="h-full w-full object-cover" />
        </div>
      </div>
    </div>
  )
}

export function ReadyMark({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        'grid size-5 place-items-center rounded-full',
        ready ? 'bg-[var(--forest)] text-[var(--paper)]' : 'bg-muted text-muted-foreground',
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  )
}

export function MobileSheet({
  title,
  open,
  onClose,
  children,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] xl:hidden">
      <button type="button" className="absolute inset-0 bg-[#13261f]/40" aria-label="Close" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-medium text-[var(--forest)]">{title}</p>
          <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-[#eef3f0]" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SlideOver({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] xl:hidden">
      <button type="button" className="absolute inset-0 bg-[#13261f]/40" aria-label="Close" onClick={onClose} />
      <div className={cn('absolute inset-x-0 bottom-0 max-h-[94vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl', className)}>
        {children}
      </div>
    </div>
  )
}
