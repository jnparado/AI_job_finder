import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { CandidateLandingPage, EmployerLandingPage, LandingPage } from '@/pages/Landing'
import { CallbackPage, LoginPage, RegisterPage, VerifyPage } from '@/pages/Auth'
import { OnboardingPage } from '@/pages/Onboarding'
import { DashboardPage } from '@/pages/Dashboard'
import { JobDetailsPage, JobsPage } from '@/pages/Jobs'
import { ApplicationDetailsPage, ApplicationsPage } from '@/pages/Applications'
import { ResumePage } from '@/pages/Resume'
import { ProfilePage } from '@/pages/Profile'
import { CareerPage, InterviewPage, SettingsPage } from '@/pages/Settings'
import { BillingPage } from '@/pages/Billing'
import { RequireEmployer, RequireOnboarding, RequireSession } from '@/pages/guards'
import { EmployerShell } from '@/components/layout/EmployerShell'
import {
  EmployerApplicationPage,
  EmployerDashboardPage,
  EmployerInboxPage,
  EmployerJobsPage,
  EmployerPostJobPage,
  EmployerSetupPage,
} from '@/pages/Employer'
import { MetaPixel } from '@/components/social/MetaPixel'
import { GoogleTags } from '@/components/social/GoogleTags'
import { JsonLd } from '@/components/social/JsonLd'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MetaPixel />
        <GoogleTags />
        <JsonLd />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/candidates" element={<CandidateLandingPage />} />
            <Route path="/employers" element={<EmployerLandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
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
                <Route path="resume" element={<ResumePage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="interview" element={<InterviewPage />} />
                <Route path="career" element={<CareerPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="billing" element={<BillingPage />} />
              </Route>
            </Route>
            <Route element={<RequireEmployer />}>
              <Route path="/employer" element={<EmployerShell />}>
                <Route index element={<EmployerDashboardPage />} />
                <Route path="jobs" element={<EmployerJobsPage />} />
                <Route path="jobs/new" element={<EmployerPostJobPage />} />
                <Route path="inbox" element={<EmployerInboxPage />} />
                <Route path="inbox/:id" element={<EmployerApplicationPage />} />
                <Route path="billing" element={<BillingPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
