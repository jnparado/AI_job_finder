import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { supabaseAuth } from './supabase'
import { DEMO_EMPLOYER, DEMO_USER } from './memory'

export const ACCESS_COOKIE = 'atelier_access'
export const REFRESH_COOKIE = 'atelier_refresh'
export const DEMO_COOKIE = 'atelier_demo'

export type SessionUser = { id: string; email: string }

const ACCESS_MAX_AGE = 60 * 60
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7

function cookieSecure() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
}

function cookieBase(maxAge: number) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'Lax' as const,
    path: '/',
    maxAge,
  }
}

function cookieClear() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'Lax' as const,
    path: '/',
  }
}

export function readAccessCookie(c: Context) {
  return getCookie(c, ACCESS_COOKIE) || ''
}

export function readRefreshCookie(c: Context) {
  return getCookie(c, REFRESH_COOKIE) || ''
}

export function readDemoCookie(c: Context): 'demo' | 'employer' | '' {
  const value = getCookie(c, DEMO_COOKIE)
  if (value === 'employer') return 'employer'
  if (value === 'demo') return 'demo'
  return ''
}

export function writeAuthCookies(c: Context, accessToken: string, refreshToken?: string) {
  setCookie(c, ACCESS_COOKIE, accessToken, cookieBase(ACCESS_MAX_AGE))
  if (refreshToken) setCookie(c, REFRESH_COOKIE, refreshToken, cookieBase(REFRESH_MAX_AGE))
  deleteCookie(c, DEMO_COOKIE, cookieClear())
}

export function writeDemoCookie(c: Context, kind: 'demo' | 'employer') {
  setCookie(c, DEMO_COOKIE, kind, cookieBase(REFRESH_MAX_AGE))
  deleteCookie(c, ACCESS_COOKIE, cookieClear())
  deleteCookie(c, REFRESH_COOKIE, cookieClear())
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, ACCESS_COOKIE, cookieClear())
  deleteCookie(c, REFRESH_COOKIE, cookieClear())
  deleteCookie(c, DEMO_COOKIE, cookieClear())
}

export function demoUserFromKind(kind: 'demo' | 'employer'): SessionUser {
  return kind === 'employer'
    ? { id: DEMO_EMPLOYER, email: 'hiring@atelier.local' }
    : { id: DEMO_USER, email: 'demo@atelier.local' }
}

export async function userFromAccessToken(token: string): Promise<SessionUser | null> {
  if (!token || !supabaseAuth) return null
  const { data } = await supabaseAuth.auth.getUser(token)
  if (!data.user) return null
  return { id: data.user.id, email: data.user.email ?? '' }
}

export async function rotateAccessCookie(c: Context): Promise<string | null> {
  const refresh = readRefreshCookie(c)
  if (!refresh || !supabaseAuth) return null
  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refresh })
  if (error || !data.session?.access_token) return null
  writeAuthCookies(c, data.session.access_token, data.session.refresh_token)
  return data.session.access_token
}

export function cookieOriginAllowed(c: Context, allowed: string[]) {
  const method = c.req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true
  const origin = (c.req.header('Origin') ?? '').replace(/\/$/, '')
  if (origin && allowed.includes(origin)) return true
  const referer = c.req.header('Referer') ?? ''
  return allowed.some((base) => referer === base || referer.startsWith(`${base}/`))
}
