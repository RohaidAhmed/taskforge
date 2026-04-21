// lib/db/comments.ts
import { createClient } from '@/lib/supabase/server'
import type { CommentWithAuthor, ActivityLogWithUser } from '@/types/database'

// ── Comments ──────────────────────────────────────────────────

export async function getCommentsForTask(taskId: string): Promise<CommentWithAuthor[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

    if (error || !data) return []

    // Fetch author profiles
    const authorIds = [...new Set(data.map((c) => c.author_id))]
    const { getUserProfiles } = await import('./workspaces')
    const profiles = await getUserProfiles(authorIds)

    return data.map((comment) => ({
        ...comment,
        author: profiles.find((p) => p.id === comment.author_id) ?? {
            id: comment.author_id,
            email: 'Unknown',
            full_name: null,
            avatar_url: null,
        },
    })) as CommentWithAuthor[]
}

export async function createComment(payload: {
    task_id: string
    workspace_id: string
    author_id: string
    body: string
}): Promise<{ data: CommentWithAuthor | null; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('comments')
        .insert(payload)
        .select()
        .single()

    if (error) return { data: null, error: error.message }

    // Log activity
    await supabase.from('activity_log').insert({
        task_id: payload.task_id,
        workspace_id: payload.workspace_id,
        user_id: payload.author_id,
        type: 'comment_added',
        meta: {},
    })

    // Return with author profile
    const { getUserProfiles } = await import('./workspaces')
    const [profile] = await getUserProfiles([payload.author_id])

    return {
        data: {
            ...data,
            author: profile ?? {
                id: payload.author_id,
                email: '',
                full_name: null,
                avatar_url: null,
            },
        } as CommentWithAuthor,
        error: null,
    }
}

export async function updateComment(
    commentId: string,
    body: string
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('comments')
        .update({ body, edited_at: new Date().toISOString() })
        .eq('id', commentId)
    return { error: error?.message ?? null }
}

export async function deleteComment(
    commentId: string,
    taskId: string,
    workspaceId: string,
    userId: string
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)

    if (!error) {
        await supabase.from('activity_log').insert({
            task_id: taskId,
            workspace_id: workspaceId,
            user_id: userId,
            type: 'comment_deleted',
            meta: {},
        })
    }

    return { error: error?.message ?? null }
}

// ── Activity log ──────────────────────────────────────────────

export async function getActivityForTask(taskId: string): Promise<ActivityLogWithUser[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

    if (error || !data) return []

    const userIds = [...new Set(data.map((a) => a.user_id))]
    const { getUserProfiles } = await import('./workspaces')
    const profiles = await getUserProfiles(userIds)

    return data.map((entry) => ({
        ...entry,
        user: profiles.find((p) => p.id === entry.user_id) ?? {
            id: entry.user_id,
            email: 'Unknown',
            full_name: null,
            avatar_url: null,
        },
    })) as ActivityLogWithUser[]
}