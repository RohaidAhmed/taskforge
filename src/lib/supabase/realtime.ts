// lib/supabase/realtime.ts
// ─────────────────────────────────────────────────────────────
// Realtime channel management.
// Creates one channel per project_id and reuses it.
// Used by the Kanban board in Sprint 2.
// ─────────────────────────────────────────────────────────────

import { createClient } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type ChannelEvent = 'INSERT' | 'UPDATE' | 'DELETE'
type TableName = 'tasks' | 'comments' | 'activity_log' | 'task_labels'

interface RealtimePayload<T = Record<string, unknown>> {
    eventType: ChannelEvent
    new: T
    old: Partial<T>
    schema: string
    table: string
    commit_timestamp: string
}

type ChangeHandler<T = Record<string, unknown>> = (
    payload: RealtimePayload<T>
) => void

// Track active channels to avoid duplicates
const activeChannels = new Map<string, RealtimeChannel>()

export function subscribeToProject<T = Record<string, unknown>>(
    projectId: string,
    table: TableName,
    handler: ChangeHandler<T>
): () => void {
    const channelKey = `${table}:${projectId}`
    const supabase = createClient()

    // Reuse existing channel if one exists
    if (activeChannels.has(channelKey)) {
        activeChannels.get(channelKey)!.unsubscribe()
    }

    const channel = supabase
        .channel(channelKey)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table,
                filter: `project_id=eq.${projectId}`,
            },
            (payload) => handler(payload as RealtimePayload<T>)
        )
        .subscribe()

    activeChannels.set(channelKey, channel)

    // Return unsubscribe function
    return () => {
        channel.unsubscribe()
        activeChannels.delete(channelKey)
    }
}

export function subscribeToWorkspace<T = Record<string, unknown>>(
    workspaceId: string,
    table: TableName,
    handler: ChangeHandler<T>
): () => void {
    const channelKey = `${table}:workspace:${workspaceId}`
    const supabase = createClient()

    if (activeChannels.has(channelKey)) {
        activeChannels.get(channelKey)!.unsubscribe()
    }

    const channel = supabase
        .channel(channelKey)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table,
                filter: `workspace_id=eq.${workspaceId}`,
            },
            (payload) => handler(payload as RealtimePayload<T>)
        )
        .subscribe()

    activeChannels.set(channelKey, channel)

    return () => {
        channel.unsubscribe()
        activeChannels.delete(channelKey)
    }
}
