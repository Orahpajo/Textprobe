import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)

/**
 * PKCE statt Implicit-Flow: Der Magic Link kommt dann als `?code=...` zurück
 * und kollidiert nicht mit dem Hash-Router, den GitHub Pages braucht.
 */
export const supabase: SupabaseClient = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})

/** Ziel für den Magic Link – funktioniert lokal wie unter /Textprobe/ auf GitHub Pages. */
export function authRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}
