// lib/db/list.ts
// ─────────────────────────────────────────────────────────────
// List view queries — supports multi-value filters and sorting.
// Kept separate from tasks.ts to avoid bloating the board query.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import type {
    TaskWithAssignee,
    TaskStatus,
    TaskPriority,
    Label,
} from '@/types/database'
import { getUserProfiles } from './workspaces'

export interface ListFilters {
    statuses: TaskStatus[]
    priorities: TaskPriority[]
    assigneeIds: string[]       // empty = all
    labelIds: string[]       // empty = all
    search: string
    dueSoon: boolean        // tasks due in next 3 days
    overdue: boolean
}

export type SortField = 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'status' | 'title'
export type SortDirection = 'asc' | 'desc'

export interface ListSort {
    field: SortField
    direction: SortDirection
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
    urgent: 0, high: 1, medium: 2, low: 3, no_priority: 4,
}

export async function getTasksForList(
    projectId: string,
    filters: Partial<ListFilters> = {},
    sort: ListSort = { field: 'created_at', direction: 'desc' }
): Promise<TaskWithAssignee[]> {
    const supabase = await createClient()

    let query = supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .is('parent_id', null)

    // ── Filters ───────────────────────────────────────────────
    if (filters.statuses?.length) {
        query = query.in('status', filters.statuses)
    }

    if (filters.priorities?.length) {
        query = query.in('priority', filters.priorities)
    }

    if (filters.assigneeIds?.length) {
        query = query.in('assignee_id', filters.assigneeIds)
    }

    if (filters.search?.trim()) {
        // pg_trgm similarity search on title
        query = query.ilike('title', `%${filters.search.trim()}%`)
    }

    if (filters.overdue) {
        const today = new Date().toISOString().split('T')[0]
        query = query.lt('due_date', today).not('due_date', 'is', null)
    } else if (filters.dueSoon) {
        const today = new Date().toISOString().split('T')[0]
        const inThree = new Date(Date.now() + 3 * 864e5).toISOString().split('T')[0]
        query = query.gte('due_date', today).lte('due_date', inThree)
    }

    // ── DB-level sort (everything except priority — handled client-side) ──
    if (sort.field !== 'priority') {
        query = query.order(sort.field, {
            ascending: sort.direction === 'asc',
            nullsFirst: false,
        })
    } else {
        query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error || !data) return []

    // ── Enrich with assignees + labels ────────────────────────
    const taskIds = data.map(t => t.id)
    const assigneeIds = [...new Set(data.map(t => t.assignee_id).filter(Boolean))] as string[]

    const [labelsMap, profiles] = await Promise.all([
        getLabelsMapForTasks(taskIds),
        assigneeIds.length ? getUserProfiles(assigneeIds) : Promise.resolve([]),
    ])

    // ── Label filter (done client-side after join) ─────────────
    let tasks: TaskWithAssignee[] = data.map(task => ({
        ...task,
        labels: labelsMap[task.id] ?? [],
        assignee: profiles.find(p => p.id === task.assignee_id) ?? null,
    }))

    if (filters.labelIds?.length) {
        tasks = tasks.filter(t =>
            filters.labelIds!.some(id => t.labels.some(l => l.id === id))
        )
    }

    // ── Priority sort (client-side — enum has no natural DB order) ─
    if (sort.field === 'priority') {
        tasks.sort((a, b) => {
            const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
            return sort.direction === 'asc' ? diff : -diff
        })
    }

    return tasks
}

// ── My Tasks — all tasks assigned to a user across workspaces ─
export async function getMyTasks(
    userId: string,
    workspaceId: string,
    filters: Partial<ListFilters> = {},
    sort: ListSort = { field: 'created_at', direction: 'desc' }
): Promise<TaskWithAssignee[]> {
    const supabase = await createClient()

    let query = supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('assignee_id', userId)
        .is('deleted_at', null)
        .is('parent_id', null)
        .not('status', 'in', '("done","cancelled")')

    if (filters.statuses?.length) query = query.in('status', filters.statuses)
    if (filters.priorities?.length) query = query.in('priority', filters.priorities)
    if (filters.search?.trim()) query = query.ilike('title', `%${filters.search.trim()}%`)

    if (sort.field !== 'priority') {
        query = query.order(sort.field, { ascending: sort.direction === 'asc', nullsFirst: false })
    } else {
        query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query
    if (error || !data) return []

    const taskIds = data.map(t => t.id)
    const labelsMap = await getLabelsMapForTasks(taskIds)

    let tasks: TaskWithAssignee[] = data.map(task => ({
        ...task,
        labels: labelsMap[task.id] ?? [],
        assignee: { id: userId, email: '', full_name: null, avatar_url: null },
    }))

    if (filters.labelIds?.length) {
        tasks = tasks.filter(t =>
            filters.labelIds!.some(id => t.labels.some(l => l.id === id))
        )
    }

    if (sort.field === 'priority') {
        tasks.sort((a, b) => {
            const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
            return sort.direction === 'asc' ? diff : -diff
        })
    }

    return tasks
}

// ── Helper ────────────────────────────────────────────────────
async function getLabelsMapForTasks(
    taskIds: string[]
): Promise<Record<string, Label[]>> {
    if (!taskIds.length) return {}
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