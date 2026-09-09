import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isStaffRole, parseAccountRole } from '@shared/types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(
  url && key && !url.includes('YOUR_PROJECT') && !key.includes('your_anon_key'),
)

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

const INTENDED_ROLE_KEY = 'atelier-intended-role'
const INTENDED_COMPANY_KEY = 'atelier-intended-company'

export function rememberIntendedAccount(role: 'candidate' | 'employer', companyName = '') {
  sessionStorage.setItem(INTENDED_ROLE_KEY, role)
  if (role === 'employer' && companyName) sessionStorage.setItem(INTENDED_COMPANY_KEY, companyName)
  else sessionStorage.removeItem(INTENDED_COMPANY_KEY)
}

export function takeIntendedAccount(): { role: 'candidate' | 'employer'; companyName: string } {
  const role = sessionStorage.getItem(INTENDED_ROLE_KEY) === 'employer' ? 'employer' : 'candidate'
  const companyName = sessionStorage.getItem(INTENDED_COMPANY_KEY) ?? ''
  sessionStorage.removeItem(INTENDED_ROLE_KEY)
  sessionStorage.removeItem(INTENDED_COMPANY_KEY)
  return { role, companyName }
}

export async function upsertOwnProfile(input: {
  id: string
  email: string
  role?: 'candidate' | 'employer'
  companyName?: string
}) {
  if (!supabase) return
  const { data: existing } = await supabase.from('profiles').select('role').eq('id', input.id).maybeSingle()
  if (isStaffRole(parseAccountRole(existing?.role))) {
    const { error } = await supabase.from('profiles').upsert({ id: input.id, email: input.email }, { onConflict: 'id' })
    if (error) console.warn('upsertOwnProfile', error.message)
    return
  }
  const role = input.role === 'employer' ? 'employer' : 'candidate'
  const row: Record<string, unknown> = {
    id: input.id,
    email: input.email,
    role,
    company_name: input.companyName ?? '',
  }
  if (role === 'employer') row.onboarding_completed = Boolean(input.companyName)
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })
  if (error) console.warn('upsertOwnProfile', error.message)
}
