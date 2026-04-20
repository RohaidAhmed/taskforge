// lib/db/auth.ts
// ─────────────────────────────────────────────────────────────
// Auth helpers. All auth interactions go through here.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/database'

export async function getCurrentUser(): Promise<UserProfile | null> {
    const supabase = await createClient()

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) return null

    return {
        id: user.id,
        email: user.email ?? '',
        full_name: (user.user_metadata?.full_name as string) ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    }
}

export async function requireUser(): Promise<UserProfile> {
    const user = await getCurrentUser()
    if (!user) {
        // This will be caught by middleware, but acts as a safety net
        throw new Error('Unauthorized')
    }
    return user
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
}
