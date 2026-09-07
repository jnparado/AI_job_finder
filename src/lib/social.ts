import type { Provider } from '@supabase/supabase-js'

export const AUTH_PROVIDERS: { id: Provider; label: string; scopes?: string }[] = [
  { id: 'facebook', label: 'Meta', scopes: 'email,public_profile' },
  { id: 'google', label: 'Google', scopes: 'openid email profile' },
  { id: 'linkedin_oidc', label: 'LinkedIn', scopes: 'openid profile email' },
  { id: 'twitter', label: 'X' },
  { id: 'apple', label: 'Apple', scopes: 'name email' },
  { id: 'github', label: 'GitHub', scopes: 'read:user user:email' },
  { id: 'discord', label: 'Discord', scopes: 'identify email' },
  { id: 'slack', label: 'Slack', scopes: 'openid profile email' },
]

export function oauthOptions(_provider: Provider) {
  return {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : publicAppUrl()}/auth/callback`,
  }
}

export const SOCIAL_LINK_FIELDS = [
  { id: 'google', label: 'Google', placeholder: 'https://myaccount.google.com' },
  { id: 'facebook', label: 'Facebook / Meta', placeholder: 'https://facebook.com/you' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/you' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/you' },
  { id: 'x', label: 'X', placeholder: 'https://x.com/you' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@you' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@you' },
  { id: 'threads', label: 'Threads', placeholder: 'https://threads.net/@you' },
  { id: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/15551234567' },
  { id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/you' },
  { id: 'github', label: 'GitHub', placeholder: 'https://github.com/you' },
] as const

export interface SocialProfile {
  id: string
  label: string
  href: string
}

function envUrl(key: string) {
  const value = (import.meta.env[key] as string | undefined)?.trim()
  return value || ''
}

export function publicAppUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  return (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') || 'https://atelier.app'
}

export function socialProfiles(): SocialProfile[] {
  const rows: [string, string, string][] = [
    ['facebook', 'Facebook', envUrl('VITE_SOCIAL_FACEBOOK')],
    ['instagram', 'Instagram', envUrl('VITE_SOCIAL_INSTAGRAM')],
    ['threads', 'Threads', envUrl('VITE_SOCIAL_THREADS')],
    ['linkedin', 'LinkedIn', envUrl('VITE_SOCIAL_LINKEDIN')],
    ['x', 'X', envUrl('VITE_SOCIAL_X')],
    ['tiktok', 'TikTok', envUrl('VITE_SOCIAL_TIKTOK')],
    ['youtube', 'YouTube', envUrl('VITE_SOCIAL_YOUTUBE')],
    ['whatsapp', 'WhatsApp', envUrl('VITE_SOCIAL_WHATSAPP')],
    ['telegram', 'Telegram', envUrl('VITE_SOCIAL_TELEGRAM')],
    ['pinterest', 'Pinterest', envUrl('VITE_SOCIAL_PINTEREST')],
  ]
  return rows.filter(([, , href]) => href).map(([id, label, href]) => ({ id, label, href }))
}

export function shareTargets(url: string, text: string) {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(text)
  return [
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'instagram', label: 'Instagram', href: envUrl('VITE_SOCIAL_INSTAGRAM') || `https://www.instagram.com/` },
    { id: 'threads', label: 'Threads', href: `https://www.threads.net/intent/post?text=${t}%20${u}` },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: 'reddit', label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: 'pinterest', label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}` },
    { id: 'tiktok', label: 'TikTok', href: envUrl('VITE_SOCIAL_TIKTOK') || 'https://www.tiktok.com/' },
    { id: 'email', label: 'Email', href: `mailto:?subject=${t}&body=${t}%20${u}` },
  ]
}

export async function shareNative(url: string, text: string) {
  if (navigator.share) {
    await navigator.share({ title: 'Atelier', text, url })
    return true
  }
  await navigator.clipboard.writeText(`${text} ${url}`)
  return false
}
