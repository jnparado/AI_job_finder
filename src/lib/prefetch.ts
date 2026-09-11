import type { QueryClient } from '@tanstack/react-query'
import { api } from './api'

const loaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Landing'),
  '/employers': () => import('@/pages/Landing'),
  '/login': () => import('@/pages/Auth'),
  '/register': () => import('@/pages/Auth'),
  '/join': () => import('@/pages/JoinEmployer'),
  '/app': () => import('@/pages/Dashboard'),
  '/app/jobs': () => import('@/pages/Jobs'),
  '/app/applications': () => import('@/pages/Applications'),
  '/app/messages': () => import('@/pages/Messages'),
  '/app/resume': () => import('@/pages/Resume'),
  '/app/profile': () => import('@/pages/Profile'),
  '/app/career': () => import('@/pages/Career'),
  '/app/settings': () => import('@/pages/Settings'),
  '/app/interview': () => import('@/pages/Settings'),
  '/app/finances': () => import('@/pages/Finances'),
  '/app/ateliar': () => import('@/pages/Ateliar'),
  '/employer': () => import('@/pages/Employer'),
  '/employer/jobs': () => import('@/pages/Employer'),
  '/employer/jobs/new': () => import('@/pages/Employer'),
  '/employer/inbox': () => import('@/pages/Employer'),
  '/employer/messages': () => import('@/pages/Messages'),
  '/employer/finances': () => import('@/pages/Finances'),
  '/employer/ateliar': () => import('@/pages/Ateliar'),
  '/employer/company': () => import('@/pages/Employer'),
  '/employer/settings': () => import('@/pages/Employer'),
  '/admin': () => import('@/pages/Admin'),
}

const warmed = new Set<string>()

export function prefetchRoute(to: string) {
  const path = to.split('?')[0]
  const load = loaders[path]
  if (!load || warmed.has(path)) return
  warmed.add(path)
  void load()
}

export function warmCandidateDesk(qc: QueryClient) {
  prefetchRoute('/app')
  void qc.prefetchQuery({
    queryKey: ['candidate-home'],
    queryFn: () => api('/api/candidate/home'),
    staleTime: 30_000,
  })
}
