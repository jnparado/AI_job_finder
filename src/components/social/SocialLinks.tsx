import { Mail, MessageCircle, Send, Share2 } from 'lucide-react'
import type { ReactElement, SVGProps } from 'react'
import { publicAppUrl, shareNative, shareTargets, socialProfiles } from '@/lib/social'

type Icon = (props: { className?: string }) => ReactElement

function Brand({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  )
}

const Facebook: Icon = ({ className }) => (
  <Brand className={className} d="M14 8h3V4.5h-3c-2.2 0-4 1.8-4 4V11H7v3.5h3V22h3.5v-7.5H17L17.7 11h-3.2V8.5c0-.3.2-.5.5-.5Z" />
)
const Instagram: Icon = ({ className }) => (
  <Brand
    className={className}
    d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm8 2H8a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3Zm-4 3.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2Zm0 1.8A2 2 0 1 0 14 12a2 2 0 0 0-2-2Zm4.4-2.7a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9Z"
  />
)
const Linkedin: Icon = ({ className }) => (
  <Brand className={className} d="M6.2 9.2H3.4V21h2.8V9.2ZM4.8 3.5A1.7 1.7 0 1 0 6.5 5.2 1.7 1.7 0 0 0 4.8 3.5ZM13 9.2H10.3V21H13v-6.2c0-2 1.3-2.6 2.1-2.6s1.8.6 1.8 2.6V21h2.8v-7c0-3.6-2-5-4.3-5A3.6 3.6 0 0 0 13 10.4V9.2Z" />
)
const Youtube: Icon = ({ className }) => (
  <Brand className={className} d="M22 12.2s0-3.2-.4-4.6a2.8 2.8 0 0 0-2-2C17.8 5.2 12 5.2 12 5.2s-5.8 0-7.6.4a2.8 2.8 0 0 0-2 2C2 9 2 12.2 2 12.2s0 3.2.4 4.6a2.8 2.8 0 0 0 2 2c1.8.4 7.6.4 7.6.4s5.8 0 7.6-.4a2.8 2.8 0 0 0 2-2c.4-1.4.4-4.6.4-4.6ZM10.2 15.5V8.9l6 3.3Z" />
)
function XMark({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.9 2H22l-6.8 7.8L22.7 22h-6.6l-5.2-6.8L5.2 22H2l7.3-8.4L1.5 2h6.7l4.7 6.2L18.9 2Zm-1.2 18h1.8L6.4 3.9H4.5L17.7 20Z" />
    </svg>
  )
}

const ICONS: Record<string, Icon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  email: Mail as unknown as Icon,
  whatsapp: MessageCircle as unknown as Icon,
  telegram: Send as unknown as Icon,
  x: XMark as Icon,
  twitter: XMark as Icon,
  threads: Instagram,
  reddit: Share2 as unknown as Icon,
  pinterest: Share2 as unknown as Icon,
  tiktok: Share2 as unknown as Icon,
}

export function SocialFollow({
  light = false,
  omit = [],
}: {
  light?: boolean
  omit?: string[]
}) {
  const hidden = new Set(omit)
  const profiles = socialProfiles().filter((p) => !hidden.has(p.id))
  const tone = light
    ? 'border-[#c9c0ae33] text-[#d8d0c0] hover:border-[#c6a15b] hover:text-[var(--paper)]'
    : 'border-border text-muted-foreground hover:border-[var(--forest)] hover:text-foreground'

  if (!profiles.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {profiles.map((p) => {
        const Icon = ICONS[p.id] ?? (Share2 as unknown as Icon)
        return (
          <a
            key={p.id}
            href={p.href}
            target="_blank"
            rel="noreferrer"
            aria-label={p.label}
            title={p.label}
            className={`grid size-9 place-items-center rounded-full border ${tone}`}
          >
            <Icon className="size-4" />
          </a>
        )
      })}
    </div>
  )
}

export function SocialShare({
  light = false,
  url,
  text = 'Jobs that fit. Hires that fit. — Atelier',
  label = 'Share',
}: {
  light?: boolean
  url?: string
  text?: string
  label?: string
}) {
  const href = url ?? (typeof window !== 'undefined' ? window.location.href : publicAppUrl())
  const tone = light
    ? 'border-[#c9c0ae33] text-[#d8d0c0] hover:border-[#c6a15b] hover:text-[var(--paper)]'
    : 'border-border text-muted-foreground hover:border-[var(--forest)] hover:text-foreground'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`mr-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${light ? 'text-[#c6a15b]' : 'text-muted-foreground'}`}>
        {label}
      </span>
      <button
        type="button"
        className={`grid size-9 place-items-center rounded-full border ${tone}`}
        aria-label="Share"
        onClick={() => void shareNative(href, text)}
      >
        <Share2 className="size-4" />
      </button>
      {shareTargets(href, text).map((p) => {
        const Icon = ICONS[p.id] ?? (Share2 as unknown as Icon)
        return (
          <a
            key={p.id}
            href={p.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Share on ${p.label}`}
            title={p.label}
            className={`grid size-9 place-items-center rounded-full border ${tone}`}
          >
            <Icon className="size-4" />
          </a>
        )
      })}
    </div>
  )
}
