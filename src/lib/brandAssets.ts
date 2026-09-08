export type AuthShot = {
  slug: string
  file: string
  role: 'candidate' | 'employer' | 'shared'
  mode: 'login' | 'register' | 'any'
  alt: string
}

export type LandingSlide = {
  file: string
  alt: string
}

export const AUTH_SHOTS: AuthShot[] = [
  { slug: 'auth-candidate-login', file: 'auth-candidate-login.jpg', role: 'candidate', mode: 'login', alt: 'Applicant reviewing roles by a window' },
  { slug: 'auth-candidate-signup', file: 'auth-candidate-signup.jpg', role: 'candidate', mode: 'register', alt: 'Applicant preparing a profile' },
  { slug: 'auth-candidate-desk', file: 'auth-candidate-desk.jpg', role: 'candidate', mode: 'any', alt: 'Applicant reviewing match scores' },
  { slug: 'auth-interview', file: 'auth-interview.jpg', role: 'candidate', mode: 'any', alt: 'Applicant on a video interview' },
  { slug: 'auth-employer-login', file: 'auth-employer-login.jpg', role: 'employer', mode: 'login', alt: 'Hiring manager reviewing a shortlist' },
  { slug: 'auth-employer-signup', file: 'auth-employer-signup.jpg', role: 'employer', mode: 'register', alt: 'Hiring team posting a role' },
  { slug: 'auth-employer-inbox', file: 'auth-employer-inbox.jpg', role: 'employer', mode: 'any', alt: 'Employer reviewing approved packets' },
  { slug: 'auth-workshop', file: 'auth-workshop.jpg', role: 'shared', mode: 'any', alt: 'A calm workshop loft' },
]

export const CANDIDATE_HERO_SLIDES: LandingSlide[] = [
  { file: 'candidate-hero.jpg', alt: 'Applicant reviewing matched roles by a window' },
  { file: 'candidate-window.jpg', alt: 'Applicant pausing by a sunlit workshop window' },
  { file: 'candidate-approve.jpg', alt: 'Applicant reviewing a packet before sending' },
  { file: 'candidate-cafe.jpg', alt: 'Applicant searching roles in a quiet cafe' },
  { file: 'candidate-notebook.jpg', alt: 'Applicant taking notes after a match search' },
]

export const EMPLOYER_HERO_SLIDES: LandingSlide[] = [
  { file: 'employer-hero.jpg', alt: 'Hiring manager reviewing matches on a tablet' },
  { file: 'employer-tablet.jpg', alt: 'Hiring lead with a shortlist on a tablet' },
  { file: 'employer-meeting.jpg', alt: 'A hiring pair reviewing an approved packet' },
  { file: 'employer-review.jpg', alt: 'Founder reviewing candidates at a standing desk' },
  { file: 'employer-studio.jpg', alt: 'Studio founder walking through the workshop' },
]

export function localBrandPath(file: string, folder = 'auth') {
  return `/brand/${folder}/${file}`
}

export function supabaseBrandUrl(file: string, folder = 'auth') {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
  if (!base || base.includes('YOUR_PROJECT')) return ''
  return `${base}/storage/v1/object/public/brand/${folder}/${file}`
}

export function brandSrc(file: string, folder = 'auth') {
  return supabaseBrandUrl(file, folder) || localBrandPath(file, folder)
}

export function authHero(role: 'candidate' | 'employer', mode: 'login' | 'register'): AuthShot {
  return (
    AUTH_SHOTS.find((shot) => shot.role === role && shot.mode === mode) ??
    AUTH_SHOTS.find((shot) => shot.role === role) ??
    AUTH_SHOTS[0]
  )
}
