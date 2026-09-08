export type AuthShot = {
  slug: string
  file: string
  role: 'candidate' | 'employer' | 'shared'
  mode: 'login' | 'register' | 'any'
  alt: string
}

export const AUTH_SHOTS: AuthShot[] = [
  { slug: 'auth-candidate-login', file: 'auth-candidate-login.png', role: 'candidate', mode: 'login', alt: 'Applicant reviewing roles by a window' },
  { slug: 'auth-candidate-signup', file: 'auth-candidate-signup.png', role: 'candidate', mode: 'register', alt: 'Applicant preparing a profile' },
  { slug: 'auth-candidate-desk', file: 'auth-candidate-desk.png', role: 'candidate', mode: 'any', alt: 'Applicant reviewing match scores' },
  { slug: 'auth-interview', file: 'auth-interview.png', role: 'candidate', mode: 'any', alt: 'Applicant on a video interview' },
  { slug: 'auth-employer-login', file: 'auth-employer-login.png', role: 'employer', mode: 'login', alt: 'Hiring manager reviewing a shortlist' },
  { slug: 'auth-employer-signup', file: 'auth-employer-signup.png', role: 'employer', mode: 'register', alt: 'Hiring team posting a role' },
  { slug: 'auth-employer-inbox', file: 'auth-employer-inbox.png', role: 'employer', mode: 'any', alt: 'Employer reviewing approved packets' },
  { slug: 'auth-workshop', file: 'auth-workshop.png', role: 'shared', mode: 'any', alt: 'A calm workshop loft' },
]

export function localBrandPath(file: string) {
  return `/brand/auth/${file}`
}

export function supabaseBrandUrl(file: string) {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
  if (!base || base.includes('YOUR_PROJECT')) return ''
  return `${base}/storage/v1/object/public/brand/auth/${file}`
}

export function authHero(role: 'candidate' | 'employer', mode: 'login' | 'register'): AuthShot {
  return (
    AUTH_SHOTS.find((shot) => shot.role === role && shot.mode === mode) ??
    AUTH_SHOTS.find((shot) => shot.role === role) ??
    AUTH_SHOTS[0]
  )
}

export function brandSrc(file: string) {
  return supabaseBrandUrl(file) || localBrandPath(file)
}
