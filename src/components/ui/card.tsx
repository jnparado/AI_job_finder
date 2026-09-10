import type { HTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'atelier-card rounded-2xl border border-[#d7ddd8] bg-card p-4 shadow-[0_12px_32px_rgba(19,38,31,0.05)] sm:rounded-3xl sm:p-6',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/80 focus:border-ring',
        className,
      )}
      {...props}
    />
  )
}

export function Badge({
  className,
  tone = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'default' | 'good' | 'warn' | 'copper' }) {
  const tones = {
    default: 'border-border',
    good: 'border-emerald-700 text-emerald-800',
    warn: 'border-amber-800 text-amber-900',
    copper: 'border-[var(--copper)] text-[var(--copper)]',
  }
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
