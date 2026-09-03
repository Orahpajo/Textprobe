import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Neues Schlüsselformat (sb_publishable_...); ältere Projekte nutzen den anon key.
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const isConfigured = Boolean(url && publishableKey)

/**
 * PKCE statt Implicit-Flow: Der Magic Link kommt dann als `?code=...` zurück
 * und kollidiert nicht mit dem Hash-Router, den GitHub Pages braucht.
 */
export const supabase: SupabaseClient = createClient(url ?? 'http://localhost', publishableKey ?? 'publishable', {
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
