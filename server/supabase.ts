import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import ws from 'ws'

function realSecret(value: string): boolean {
  return Boolean(value) && !/YOUR_PROJECT|your_anon_key|your_service_role_key|^your_/i.test(value)
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

function createServerClient(key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { transport: ws },
  })
}

export const supabaseAdmin: SupabaseClient | null =
  realSecret(url) && realSecret(service) ? createServerClient(service) : null

export const supabaseAuth: SupabaseClient | null =
  realSecret(url) && realSecret(anon) ? createServerClient(anon) : null

export const supabaseReady = Boolean(supabaseAdmin)
