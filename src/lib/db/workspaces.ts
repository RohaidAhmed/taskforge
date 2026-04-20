// lib/db/workspaces.ts
// ─────────────────────────────────────────────────────────────
// All workspace + member DB operations.
// Components and Server Actions call these functions only —
// never Supabase directly. This is the swap boundary.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import type {
    Workspace,
    WorkspaceMember,
    WorkspaceMemberWithProfile,
    CreateWorkspacePayload,
    UpdateWorkspacePayload,
    InviteMemberPayload,
    WorkspaceRole,
    UserProfile,
} from '@/types/database'

// ── Workspace queries ─────────────────────────────────────────

export async function getWorkspaceBySlug(
    slug: string
): Promise<Workspace | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', slug)
        .single()

    if (error) return null
    return data as Workspace
}

export async function getWorkspacesForUser(
    userId: string
): Promise<Workspace[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: true })

    if (error || !data) return []
    return data as Workspace[]
}

export async function createWorkspace(
    payload: CreateWorkspacePayload
): Promise<{ data: Workspace | null; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('workspaces')
        .insert({
            name: payload.name,
            slug: payload.slug,
            owner_id: payload.owner_id,
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return { data: null, error: 'A workspace with this URL already exists.' }
        }
        return { data: null, error: error.message }
    }

    return { data: data as Workspace, error: null }
}

export async function updateWorkspace(
    workspaceId: string,
    payload: UpdateWorkspacePayload
): Promise<{ data: Workspace | null; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('workspaces')
        .update(payload)
        .eq('id', workspaceId)
        .select()
        .single()

    if (error) return { data: null, error: error.message }
    return { data: data as Workspace, error: null }
}

// ── Member queries ────────────────────────────────────────────

export async function getWorkspaceMembers(
    workspaceId: string
): Promise<WorkspaceMemberWithProfile[]> {
    const supabase = await createClient()

    // Fetch members
    const { data: members, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('joined_at', { ascending: true })

    if (error || !members) return []

    // Fetch user profiles from auth.users via admin RPC
    // We pull email + user_metadata (full_name, avatar_url)
    const userIds = members.map((m) => m.user_id)
    const profiles = await getUserProfiles(userIds)

    return members.map((member) => ({
        ...(member as WorkspaceMember),
        profile: profiles.find((p) => p.id === member.user_id) ?? {
            id: member.user_id,
            email: 'Unknown',
            full_name: null,
            avatar_url: null,
        },
    }))
}

export async function getWorkspaceMember(
    workspaceId: string,
    userId: string
): Promise<WorkspaceMember | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single()

    if (error) return null
    return data as WorkspaceMember
}

export async function addWorkspaceMember(
    payload: InviteMemberPayload
): Promise<{ error: string | null }> {
    const supabase = await createClient()

    const { error } = await supabase.from('workspace_members').insert({
        workspace_id: payload.workspace_id,
        user_id: payload.user_id,
        role: payload.role,
        invited_by: payload.invited_by,
    })

    if (error) {
        if (error.code === '23505') {
            return { error: 'This user is already a member of the workspace.' }
        }
        return { error: error.message }
    }

    return { error: null }
}

export async function updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
): Promise<{ error: string | null }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)

    if (error) return { error: error.message }
    return { error: null }
}

export async function removeWorkspaceMember(
    workspaceId: string,
    userId: string
): Promise<{ error: string | null }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)

    if (error) return { error: error.message }
    return { error: null }
}

// ── User profile helper ───────────────────────────────────────
// Reads from auth.users.user_metadata — no separate profiles table needed.
// If you add a profiles table, update only this function.

export async function getUserProfiles(
    userIds: string[]
): Promise<UserProfile[]> {
    if (userIds.length === 0) return []

    // Use admin client to read auth.users
    const { createAdminClient } = await import('@/lib/supabase/server')
    const admin = createAdminClient()

    const profiles: UserProfile[] = []

    // Supabase admin API only supports listing users (no batch by IDs) —
    // we fetch page by page. For large workspaces consider a profiles table.
    const { data, error } = await admin.auth.admin.listUsers({
        perPage: 1000,
    })

    if (error || !data) return []

    for (const user of data.users) {
        if (userIds.includes(user.id)) {
            profiles.push({
                id: user.id,
                email: user.email ?? '',
                full_name: (user.user_metadata?.full_name as string) ?? null,
                avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
            })
        }
    }

    return profiles
}

// ── Slug generation helper ───────────────────────────────────

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 48)
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
    return data === null
}
