import { supabase } from './supabase'

const DEMO_KEY = 'aja-demo-token'
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getDemoToken(): string | null {
  return localStorage.getItem(DEMO_KEY)
}

export function setDemoToken(on: boolean | 'demo' | 'employer') {
  if (!on) localStorage.removeItem(DEMO_KEY)
  else localStorage.setItem(DEMO_KEY, on === true ? 'demo' : on)
}

async function sessionFetch(path: string, init: RequestInit = {}) {
  return fetch(path, { ...init, credentials: 'include' })
}

export async function writeServerSession(input: {
  accessToken?: string | null
  refreshToken?: string | null
  demo?: false | 'demo' | 'employer'
}) {
  try {
    await sessionFetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: input.accessToken || undefined,
        refreshToken: input.refreshToken || undefined,
        demo: input.demo || undefined,
      }),
    })
  } catch {
    /* cookie is extra hardening; Bearer still works */
  }
}

export async function clearServerSession() {
  try {
    await sessionFetch('/api/session', { method: 'DELETE' })
  } catch {
    /* ignore */
  }
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = getDemoToken()
  if (token === 'employer') return { Authorization: 'Bearer employer' }
  if (token) return { Authorization: 'Bearer demo' }
  if (accessToken) return { Authorization: `Bearer ${accessToken}` }
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  accessToken = data.session?.access_token ?? null
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const auth = await authHeader()
  for (const [k, v] of Object.entries(auth)) headers.set(k, v)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await sessionFetch(path, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export async function apiUpload<T>(
  path: string,
  body: FormData,
  onProgress?: (pct: number) => void,
): Promise<T> {
  const auth = await authHeader()
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', path)
    xhr.withCredentials = true
    for (const [k, v] of Object.entries(auth)) xhr.setRequestHeader(k, v)
    xhr.timeout = 120_000
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || '{}') as { error?: string }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json as T)
          return
        }
        reject(new Error(json.error || xhr.statusText || 'Upload failed'))
      } catch {
        reject(new Error(xhr.statusText || 'Upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))
    xhr.ontimeout = () => reject(new Error('Upload timed out. Try a smaller file.'))
    xhr.send(body)
  })
}
