import type { Provider } from '@supabase/supabase-js'
import { AUTH_PROVIDERS } from './social'

export async function loadEnabledProviders(): Promise<Provider[]> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) return []
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return []
    const json = (await res.json()) as { external?: Record<string, { enabled?: boolean }> }
    const ext = json.external ?? {}
    return AUTH_PROVIDERS.map((p) => p.id).filter((id) => ext[id]?.enabled)
  } catch {
    return []
  }
}
