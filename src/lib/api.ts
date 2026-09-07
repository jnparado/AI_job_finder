import { supabase } from './supabase'

const DEMO_KEY = 'aja-demo-token'

export function getDemoToken(): string | null {
  return localStorage.getItem(DEMO_KEY)
}

export function setDemoToken(on: boolean) {
  if (on) localStorage.setItem(DEMO_KEY, 'demo')
  else localStorage.removeItem(DEMO_KEY)
}

export async function authHeader(): Promise<Record<string, string>> {
  if (getDemoToken()) return { Authorization: 'Bearer demo' }
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
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
