import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabaseAdmin: SupabaseClient | null =
  url && service ? createClient(url, service) : null

export const supabaseAuth: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null

export const supabaseReady = Boolean(supabaseAdmin)
