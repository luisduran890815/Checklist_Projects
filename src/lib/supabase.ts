import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const forcedDemo = String(import.meta.env.VITE_DEMO_MODE).toLowerCase() === 'true'
const configured = Boolean(url && anonKey && !url.includes('TU-PROYECTO') && !anonKey.includes('TU_CLAVE'))

export const isDemoMode = forcedDemo || !configured
export const supabase: SupabaseClient | null = configured && !forcedDemo
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null
