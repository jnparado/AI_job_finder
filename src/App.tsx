import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { LandingPage } from '@/pages/Landing'
import { CallbackPage, LoginPage, RegisterPage, VerifyPage } from '@/pages/Auth'
import { OnboardingPage } from '@/pages/Onboarding'
import { DashboardPage } from '@/pages/Dashboard'
import { JobDetailsPage, JobsPage } from '@/pages/Jobs'
import { ApplicationDetailsPage, ApplicationsPage } from '@/pages/Applications'
import { ResumePage } from '@/pages/Resume'
import { ProfilePage } from '@/pages/Profile'
import { CareerPage, InterviewPage, SettingsPage } from '@/pages/Settings'
import { RequireOnboarding, RequireSession } from '@/pages/guards'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route element={<RequireSession />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
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
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
