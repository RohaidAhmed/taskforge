// lib/supabase/server.ts
// ─────────────────────────────────────────────────────────────
// Server-side Supabase client.
// Use in Server Components, Route Handlers, and Server Actions.
// Reads/writes cookies for session management via @supabase/ssr.
//
// SWAP POINT: Replace this file when changing DB providers.
// ─────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Calling setAll from a Server Component is safe to ignore —
            // middleware handles session refresh.
          }
        },
      },
    }
  )
}

// ── Admin client (service role) ───────────────────────────────
// Only use for operations that bypass RLS (e.g. invite lookups).
// NEVER expose to the browser.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
