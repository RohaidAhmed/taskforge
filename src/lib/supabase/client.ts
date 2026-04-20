// lib/supabase/client.ts
// ─────────────────────────────────────────────────────────────
// Browser-side Supabase client.
// Use in Client Components ('use client') only.
//
// SWAP POINT: If you move to a different DB provider,
// replace only this file and lib/supabase/server.ts.
// Everything in lib/db/ stays unchanged.
// ─────────────────────────────────────────────────────────────

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
