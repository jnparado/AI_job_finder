import { supabaseAdmin } from './supabase'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function findAuthUserByEmail(email: string) {
  if (!supabaseAdmin) return null
  const target = normalizeEmail(email)
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => (u.email ?? '').toLowerCase() === target) ?? null
}

export async function ensureProfileRow(
  userId: string,
  email: string,
  extras?: { role?: 'candidate' | 'employer'; companyName?: string },
) {
  if (!supabaseAdmin) return
  const row: Record<string, unknown> = { id: userId, email }
  if (extras?.role) row.role = extras.role
  if (extras?.companyName) row.company_name = extras.companyName
  if (extras?.role === 'employer') row.onboarding_completed = Boolean(extras.companyName)
  const { error } = await supabaseAdmin.from('profiles').upsert(row, { onConflict: 'id' })
  if (error) {
    const { error: fallback } = await supabaseAdmin.from('profiles').upsert({ id: userId, email }, { onConflict: 'id' })
    if (fallback) console.warn('profile upsert', fallback.message)
    else console.warn('profile upsert (role columns missing — run supabase/schema.sql)', error.message)
  }
}

export async function registerUser(
  email: string,
  password: string,
  extras?: { role?: 'candidate' | 'employer'; companyName?: string },
) {
  if (!supabaseAdmin) throw new Error('Server auth is not configured.')
  const normalized = normalizeEmail(email)
  const existing = await findAuthUserByEmail(normalized)
  if (existing) {
    if (!existing.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { email_confirm: true, password })
      await ensureProfileRow(existing.id, normalized, extras)
      return { userId: existing.id, created: false }
    }
    const err = new Error('That email is already registered. Sign in instead.')
    ;(err as Error & { code: string }).code = 'exists'
    throw err
  }
  const created = await supabaseAdmin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
    user_metadata: extras?.role ? { role: extras.role, company_name: extras.companyName ?? '' } : undefined,
  })
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message ?? 'Could not create the account.')
  }
  await ensureProfileRow(created.data.user.id, normalized, extras)
  return { userId: created.data.user.id, created: true, role: extras?.role ?? 'candidate' }
}

export async function confirmUserEmail(email: string) {
  if (!supabaseAdmin) return
  const user = await findAuthUserByEmail(email)
  if (!user || user.email_confirmed_at) return
  await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true })
}
