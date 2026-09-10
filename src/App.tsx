import { lazy, Suspense, type ComponentType } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { ScrollToHash } from '@/components/layout/ScrollToHash'
import { RequireEmployer, RequireOnboarding, RequireSession, RequireStaff } from '@/pages/guards'
import { EmployerShell } from '@/components/layout/EmployerShell'
import { LoadingScreen } from '@/components/ui/feedback'
import { MetaPixel } from '@/components/social/MetaPixel'
import { GoogleTags } from '@/components/social/GoogleTags'
import { JsonLd } from '@/components/social/JsonLd'

function lazyNamed<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T & string) {
  return lazy(async () => {
    const mod = await load()
    return { default: mod[name] as ComponentType }
  })
}

const CandidateLandingPage = lazyNamed(() => import('@/pages/Landing'), 'CandidateLandingPage')
const EmployerLandingPage = lazyNamed(() => import('@/pages/Landing'), 'EmployerLandingPage')
const AboutPage = lazyNamed(() => import('@/pages/Legal'), 'AboutPage')
const PrivacyPage = lazyNamed(() => import('@/pages/Legal'), 'PrivacyPage')
const SupportPage = lazyNamed(() => import('@/pages/Legal'), 'SupportPage')
const TermsPage = lazyNamed(() => import('@/pages/Legal'), 'TermsPage')
const CallbackPage = lazyNamed(() => import('@/pages/Auth'), 'CallbackPage')
const ForgotPasswordPage = lazyNamed(() => import('@/pages/Auth'), 'ForgotPasswordPage')
const LoginPage = lazyNamed(() => import('@/pages/Auth'), 'LoginPage')
const RegisterPage = lazyNamed(() => import('@/pages/Auth'), 'RegisterPage')
const JoinEmployerPage = lazyNamed(() => import('@/pages/JoinEmployer'), 'JoinEmployerPage')
const ResetPasswordPage = lazyNamed(() => import('@/pages/Auth'), 'ResetPasswordPage')
const VerifyPage = lazyNamed(() => import('@/pages/Auth'), 'VerifyPage')
const OnboardingPage = lazyNamed(() => import('@/pages/Onboarding'), 'OnboardingPage')
const DashboardPage = lazyNamed(() => import('@/pages/Dashboard'), 'DashboardPage')
const JobsPage = lazyNamed(() => import('@/pages/Jobs'), 'JobsPage')
const JobDetailsPage = lazyNamed(() => import('@/pages/Jobs'), 'JobDetailsPage')
const ApplicationsPage = lazyNamed(() => import('@/pages/Applications'), 'ApplicationsPage')
const ApplicationDetailsPage = lazyNamed(() => import('@/pages/Applications'), 'ApplicationDetailsPage')
const CandidateMessagesPage = lazyNamed(() => import('@/pages/Messages'), 'CandidateMessagesPage')
const CandidateThreadPage = lazyNamed(() => import('@/pages/Messages'), 'CandidateThreadPage')
const EmployerMessagesPage = lazyNamed(() => import('@/pages/Messages'), 'EmployerMessagesPage')
const EmployerThreadPage = lazyNamed(() => import('@/pages/Messages'), 'EmployerThreadPage')
const ResumePage = lazyNamed(() => import('@/pages/Resume'), 'ResumePage')
const ProfilePage = lazyNamed(() => import('@/pages/Profile'), 'ProfilePage')
const CareerPage = lazyNamed(() => import('@/pages/Career'), 'CareerPage')
const InterviewPage = lazyNamed(() => import('@/pages/Settings'), 'InterviewPage')
const SettingsPage = lazyNamed(() => import('@/pages/Settings'), 'SettingsPage')
const FinancesPage = lazyNamed(() => import('@/pages/Finances'), 'FinancesPage')
const AteliarPage = lazyNamed(() => import('@/pages/Ateliar'), 'AteliarPage')
const EmployerApplicationPage = lazyNamed(() => import('@/pages/Employer'), 'EmployerApplicationPage')
const EmployerDashboardPage = lazyNamed(() => import('@/pages/Employer'), 'EmployerDashboardPage')
const EmployerInboxPage = lazyNamed(() => import('@/pages/Employer'), 'EmployerInboxPage')
const EmployerJobsPage = lazyNamed(() => import('@/pages/Employer'), 'EmployerJobsPage')
const EmployerPostJobPage = lazyNamed(() => import('@/pages/Employer'), 'EmployerPostJobPage')
const EmployerSetupPage = lazyNamed(() => import('@/pages/Employer'), 'EmployerSetupPage')
const AdminPage = lazyNamed(() => import('@/pages/Admin'), 'AdminPage')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MetaPixel />
        <GoogleTags />
        <JsonLd />
        <BrowserRouter>
          <ScrollToHash />
          <Suspense fallback={<LoadingScreen label="Opening…" />}>
            <Routes>
              <Route path="/" element={<CandidateLandingPage />} />
              <Route path="/candidates" element={<Navigate to="/" replace />} />
              <Route path="/employers" element={<EmployerLandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/employer" element={<Navigate to="/login?role=employer" replace />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/employer" element={<Navigate to="/register?role=employer" replace />} />
              <Route path="/join" element={<JoinEmployerPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/forgot" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<CallbackPage />} />
              <Route element={<RequireSession />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/employer/setup" element={<EmployerSetupPage />} />
              </Route>
              <Route element={<RequireOnboarding />}>
                <Route path="/app" element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="jobs" element={<JobsPage />} />
                  <Route path="jobs/:id" element={<JobDetailsPage />} />
                  <Route path="applications" element={<ApplicationsPage />} />
                  <Route path="applications/:id" element={<ApplicationDetailsPage />} />
                  <Route path="messages" element={<CandidateMessagesPage />} />
                  <Route path="messages/:id" element={<CandidateThreadPage />} />
                  <Route path="resume" element={<ResumePage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="interview" element={<InterviewPage />} />
                  <Route path="career" element={<CareerPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="finances" element={<FinancesPage />} />
                  <Route path="ateliar" element={<AteliarPage />} />
                  <Route path="billing" element={<Navigate to="/app/finances" replace />} />
                </Route>
              </Route>
              <Route element={<RequireEmployer />}>
                <Route path="/employer" element={<EmployerShell />}>
                  <Route index element={<EmployerDashboardPage />} />
                  <Route path="jobs" element={<EmployerJobsPage />} />
                  <Route path="jobs/new" element={<EmployerPostJobPage />} />
                  <Route path="inbox" element={<EmployerInboxPage />} />
                  <Route path="inbox/:id" element={<EmployerApplicationPage />} />
                  <Route path="messages" element={<EmployerMessagesPage />} />
                  <Route path="messages/:id" element={<EmployerThreadPage />} />
                  <Route path="finances" element={<FinancesPage />} />
                  <Route path="ateliar" element={<AteliarPage />} />
                  <Route path="billing" element={<Navigate to="/employer/finances" replace />} />
                </Route>
              </Route>
              <Route element={<RequireStaff />}>
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/*" element={<AdminPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
