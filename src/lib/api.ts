import { supabase } from './supabase'

const DEMO_KEY = 'aja-demo-token'

export function getDemoToken(): string | null {
  return localStorage.getItem(DEMO_KEY)
}

export function setDemoToken(on: boolean | 'demo' | 'employer') {
  if (!on) localStorage.removeItem(DEMO_KEY)
  else localStorage.setItem(DEMO_KEY, on === true ? 'demo' : on)
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = getDemoToken()
  if (token === 'employer') return { Authorization: 'Bearer employer' }
  if (token) return { Authorization: 'Bearer demo' }
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const access = data.session?.access_token
  return access ? { Authorization: `Bearer ${access}` } : {}
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const auth = await authHeader()
  for (const [k, v] of Object.entries(auth)) headers.set(k, v)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}
