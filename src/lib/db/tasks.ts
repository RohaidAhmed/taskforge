// lib/db/tasks.ts
import { createClient } from '@/lib/supabase/server'
import type {
    Task,
    TaskWithAssignee,
    Label,
    CreateTaskPayload,
    UpdateTaskPayload,
    TaskStatus,
    ActivityType,
} from '@/types/database'

// ── Board query — all tasks for a project grouped for kanban ──
export async function getTasksForBoard(
    projectId: string
): Promise<TaskWithAssignee[]> {
    const supabase = await createClient()

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .is('parent_id', null)           // top-level only on board
        .order('board_order', { ascending: true })

    if (error || !tasks) return []

    // Fetch labels for all tasks
    const taskIds = tasks.map((t) => t.id)
    const labelsMap = await getLabelsForTasks(taskIds)

    // Fetch assignee profiles
    const assigneeIds = [...new Set(tasks.map((t) => t.assignee_id).filter(Boolean))] as string[]
    const profiles = assigneeIds.length > 0 ? await getProfilesById(assigneeIds) : []

    return tasks.map((task) => ({
        ...(task as Task),
        labels: labelsMap[task.id] ?? [],
        assignee: profiles.find((p) => p.id === task.assignee_id) ?? null,
    }))
}

// ── Single task ───────────────────────────────────────────────
export async function getTaskById(taskId: string): Promise<Task | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .is('deleted_at', null)
        .single()

    if (error) return null
    return data as Task
}

// ── Create ────────────────────────────────────────────────────
export async function createTask(
    payload: CreateTaskPayload
): Promise<{ data: Task | null; error: string | null }> {
    const supabase = await createClient()

    // Get max board_order for this status column
    const { data: maxRow } = await supabase
        .from('tasks')
        .select('board_order')
        .eq('project_id', payload.project_id)
        .eq('status', payload.status)
        .is('deleted_at', null)
        .order('board_order', { ascending: false })
        .limit(1)
        .maybeSingle()

    const boardOrder = maxRow ? maxRow.board_order + 1000 : 1000

    const { data, error } = await supabase
        .from('tasks')
        .insert({ ...payload, board_order: payload.board_order ?? boardOrder })
        .select()
        .single()

    if (error) return { data: null, error: error.message }

    // Log activity
    await logActivity({
        task_id: data.id,
        workspace_id: payload.workspace_id,
        user_id: payload.created_by,
        type: 'task_created',
        meta: {},
    })

    return { data: data as Task, error: null }
}

// ── Update ────────────────────────────────────────────────────
export async function updateTask(
    taskId: string,
    payload: UpdateTaskPayload,
    userId: string,
    workspaceId: string,
    previousTask?: Partial<Task>
): Promise<{ data: Task | null; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', taskId)
        .select()
        .single()

    if (error) return { data: null, error: error.message }

    // Log meaningful activity events
    if (previousTask) {
        if (payload.status && payload.status !== previousTask.status) {
            await logActivity({
                task_id: taskId, workspace_id: workspaceId, user_id: userId,
                type: 'task_status_changed',
                meta: { from: previousTask.status, to: payload.status },
            })
        }
        if (payload.priority && payload.priority !== previousTask.priority) {
            await logActivity({
                task_id: taskId, workspace_id: workspaceId, user_id: userId,
                type: 'task_priority_changed',
                meta: { from: previousTask.priority, to: payload.priority },
            })
        }
        if ('assignee_id' in payload && payload.assignee_id !== previousTask.assignee_id) {
            await logActivity({
                task_id: taskId, workspace_id: workspaceId, user_id: userId,
                type: payload.assignee_id ? 'task_assigned' : 'task_unassigned',
                meta: payload.assignee_id ? { assignee_id: payload.assignee_id } : {},
            })
        }
    }

    return { data: data as Task, error: null }
}

// ── Soft delete ───────────────────────────────────────────────
export async function deleteTask(
    taskId: string,
    userId: string,
    workspaceId: string
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId)

    if (!error) {
        await logActivity({
            task_id: taskId, workspace_id: workspaceId, user_id: userId,
            type: 'task_deleted', meta: {},
        })
    }

    return { error: error?.message ?? null }
}

// ── Reorder — fractional indexing ────────────────────────────
// Called after a drag-and-drop. Sets board_order to midpoint
// between the two neighbours, plus updates status if column changed.
export async function reorderTask(
    taskId: string,
    newStatus: TaskStatus,
    overTaskId: string | null,    // task directly above (null = top of column)
    belowTaskId: string | null,   // task directly below (null = bottom)
    projectId: string,
    userId: string,
    workspaceId: string,
    previousStatus: TaskStatus,
): Promise<{ error: string | null }> {
    const supabase = await createClient()

    let overOrder = 0
    let belowOrder = Infinity

    if (overTaskId) {
        const { data } = await supabase
            .from('tasks')
            .select('board_order')
            .eq('id', overTaskId)
            .single()
        if (data) overOrder = data.board_order
    }

    if (belowTaskId) {
        const { data } = await supabase
            .from('tasks')
            .select('board_order')
            .eq('id', belowTaskId)
            .single()
        if (data) belowOrder = data.board_order
    } else {
        // Get max order in target column
        const { data } = await supabase
            .from('tasks')
            .select('board_order')
            .eq('project_id', projectId)
            .eq('status', newStatus)
            .is('deleted_at', null)
            .order('board_order', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (data) belowOrder = data.board_order + 1000
    }

    // if (assignee_id){
    //     const {data} = await supabase
    //         .from('tasks')
    //         .select('assignee_id')

    // }

    const newOrder =
        belowOrder === Infinity
            ? overOrder + 1000
            : (overOrder + belowOrder) / 2

    const updatePayload: UpdateTaskPayload = { board_order: newOrder }
    if (newStatus !== previousStatus) updatePayload.status = newStatus

    const { error } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', taskId)

    if (!error && newStatus !== previousStatus) {
        await logActivity({
            task_id: taskId, workspace_id: workspaceId, user_id: userId,
            type: 'task_status_changed',
            meta: { from: previousStatus, to: newStatus },
        })
    }

    return { error: error?.message ?? null }
}

// ── Labels ────────────────────────────────────────────────────
export async function getLabelsForWorkspace(workspaceId: string): Promise<Label[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('labels')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name')
    return (data as Label[]) ?? []
}

async function getLabelsForTasks(
    taskIds: string[]
): Promise<Record<string, Label[]>> {
    if (taskIds.length === 0) return {}
    const supabase = await createClient()

    const { data } = await supabase
        .from('task_labels')
        .select('task_id, labels(*)')
        .in('task_id', taskIds)

    const map: Record<string, Label[]> = {}
    for (const row of data ?? []) {
        if (!map[row.task_id]) map[row.task_id] = []
        if (row.labels) map[row.task_id].push(row.labels as unknown as Label)
    }
    return map
}

export async function addLabelToTask(taskId: string, labelId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('task_labels')
        .insert({ task_id: taskId, label_id: labelId })
    return { error: error?.message ?? null }
}

export async function removeLabelFromTask(taskId: string, labelId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('task_labels')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId)
    return { error: error?.message ?? null }
}

// ── Activity log ──────────────────────────────────────────────
async function logActivity(entry: {
    task_id: string
    workspace_id: string
    user_id: string
    type: ActivityType
    meta: Record<string, unknown>
}) {
    const supabase = await createClient()
    await supabase.from('activity_log').insert(entry)
}

// ── User profiles helper (reused from workspaces) ─────────────
async function getProfilesById(userIds: string[]) {
    const { getUserProfiles } = await import('./workspaces')
    return getUserProfiles(userIds)
}