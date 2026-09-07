import type { User } from '@supabase/supabase-js'
import type { CandidateProfile, SocialIdentity } from '@shared/types'

export interface IdentityPayload {
  provider: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  avatarUrl?: string
  locale?: string
}

export function identityFromUser(user: User): IdentityPayload {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const identity = user.identities?.[user.identities.length - 1]
  const data = { ...((identity?.identity_data ?? {}) as Record<string, unknown>), ...meta }
  const fullName = str(data.full_name) || str(data.name)
  const [first, ...rest] = fullName.split(/\s+/).filter(Boolean)
  return {
    provider:
      identity?.provider ||
      (str(data.iss).includes('google') ? 'google' : str(data.iss).includes('facebook') ? 'facebook' : 'oauth'),
    email: user.email || str(data.email),
    firstName: str(data.given_name) || str(data.first_name) || first,
    lastName: str(data.family_name) || str(data.last_name) || rest.join(' '),
    fullName,
    avatarUrl: str(data.avatar_url) || str(data.picture) || str(data.avatar),
    locale: str(data.locale),
  }
}

export function mergeIdentity(profile: CandidateProfile, payload: IdentityPayload): CandidateProfile {
  const [first, ...rest] = (payload.fullName ?? '').split(/\s+/).filter(Boolean)
  const firstName = profile.firstName || payload.firstName || first || ''
  const lastName = profile.lastName || payload.lastName || rest.join(' ')
  const next: SocialIdentity = {
    provider: payload.provider || 'google',
    email: payload.email,
    name: payload.fullName || `${firstName} ${lastName}`.trim(),
    avatarUrl: payload.avatarUrl,
    connectedAt: new Date().toISOString(),
  }
  const identities = [...(profile.identities ?? []).filter((i) => i.provider !== next.provider), next]
  return {
    ...profile,
    firstName,
    lastName,
    email: profile.email || payload.email || '',
    avatarUrl: profile.avatarUrl || payload.avatarUrl || '',
    locale: profile.locale || payload.locale || '',
    identities,
  }
}

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
