// lib/store/boardStore.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { TaskWithAssignee, TaskStatus, UpdateTaskPayload } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type BoardColumns = Record<TaskStatus, TaskWithAssignee[]>

interface BoardStore {
    projectId: string | null
    columns: BoardColumns
    isLoading: boolean

    // Actions
    initBoard: (projectId: string, tasks: TaskWithAssignee[]) => void
    setLoading: (loading: boolean) => void

    // Optimistic task moves (called on drag start)
    moveTask: (
        taskId: string,
        fromStatus: TaskStatus,
        toStatus: TaskStatus,
        overTaskId: string | null,
        belowTaskId: string | null
    ) => void

    // Rollback on API failure
    rollbackMove: (snapshot: BoardColumns) => void

    // Realtime event handlers — merge incoming events from Supabase
    onTaskInserted: (task: TaskWithAssignee) => void
    onTaskUpdated: (task: TaskWithAssignee) => void
    onTaskDeleted: (taskId: string) => void

    // Local mutations (after confirmed API response)
    addTask: (task: TaskWithAssignee) => void
    updateTaskLocal: (taskId: string, payload: Partial<TaskWithAssignee>) => void
    removeTask: (taskId: string) => void

    // Snapshot for rollback
    getSnapshot: () => BoardColumns
}

// ── Status columns in display order ──────────────────────────
export const BOARD_STATUSES: TaskStatus[] = [
    'backlog',
    'todo',
    'in_progress',
    'in_review',
    'done',
    'cancelled',
]

export const STATUS_LABELS: Record<TaskStatus, string> = {
    backlog: 'Backlog',
    todo: 'Todo',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    cancelled: 'Cancelled',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
    backlog: 'text-gray-500',
    todo: 'text-blue-400',
    in_progress: 'text-yellow-400',
    in_review: 'text-purple-400',
    done: 'text-green-400',
    cancelled: 'text-gray-600',
}

// ── Helper: build empty columns ───────────────────────────────
function emptyColumns(): BoardColumns {
    return Object.fromEntries(
        BOARD_STATUSES.map((s) => [s, []])
    ) as BoardColumns;
}

// ── Helper: sort by board_order ───────────────────────────────
function sorted(tasks: TaskWithAssignee[]): TaskWithAssignee[] {
    return [...tasks].sort((a, b) => a.board_order - b.board_order)
}

// ── Store ─────────────────────────────────────────────────────
export const useBoardStore = create<BoardStore>()(
    immer((set, get) => ({
        projectId: null,
        columns: emptyColumns(),
        isLoading: true,

        initBoard(projectId, tasks) {
            set((state) => {
                state.projectId = projectId
                state.columns = emptyColumns()
                state.isLoading = false
                for (const task of tasks) {
                    state.columns[task.status].push(task)
                }
                for (const status of BOARD_STATUSES) {
                    state.columns[status] = sorted(state.columns[status])
                }
            })
        },

        setLoading(loading) {
            set((state) => { state.isLoading = loading })
        },

        getSnapshot() {
            // Deep clone for rollback
            const cols = get().columns
            return Object.fromEntries(
                BOARD_STATUSES.map((s) => [s, [...cols[s]]])
            ) as BoardColumns
        },

        moveTask(taskId, fromStatus, toStatus, overTaskId, belowTaskId) {
            set((state) => {
                // Remove from source column
                const fromCol = state.columns[fromStatus]
                const taskIndex = fromCol.findIndex((t) => t.id === taskId)
                if (taskIndex === -1) return

                const [task] = fromCol.splice(taskIndex, 1)
                task.status = toStatus

                // Compute new board_order
                const toCol = state.columns[toStatus]
                const overIdx = overTaskId ? toCol.findIndex((t) => t.id === overTaskId) : -1
                const belowIdx = belowTaskId ? toCol.findIndex((t) => t.id === belowTaskId) : -1

                const overOrder = overIdx >= 0 ? toCol[overIdx].board_order : 0
                const belowOrder = belowIdx >= 0 ? toCol[belowIdx].board_order
                    : toCol.length > 0 ? toCol[toCol.length - 1].board_order + 1000 : 1000

                task.board_order = overIdx === -1
                    ? (toCol.length === 0 ? 1000 : toCol[toCol.length - 1].board_order + 1000)
                    : (overOrder + belowOrder) / 2

                // Insert into target column at correct position
                const insertAt = belowIdx >= 0 ? belowIdx : toCol.length
                toCol.splice(insertAt, 0, task)
            })
        },

        rollbackMove(snapshot) {
            set((state) => {
                state.columns = snapshot as typeof state.columns
            })
        },

        // ── Realtime handlers ─────────────────────────────────────
        onTaskInserted(task) {
            set((state) => {
                const col = state.columns[task.status]
                // Avoid duplicates
                if (col.find((t) => t.id === task.id)) return
                col.push(task)
                state.columns[task.status] = sorted(col)
            })
        },

        onTaskUpdated(task) {
            set((state) => {
                // Remove from all columns first (status may have changed)
                for (const status of BOARD_STATUSES) {
                    state.columns[status] = state.columns[status].filter((t) => t.id !== task.id)
                }
                // Re-insert into correct column
                const col = state.columns[task.status]
                col.push(task)
                state.columns[task.status] = sorted(col)
            })
        },

        onTaskDeleted(taskId) {
            set((state) => {
                for (const status of BOARD_STATUSES) {
                    state.columns[status] = state.columns[status].filter((t) => t.id !== taskId)
                }
            })
        },

        // ── Local mutations ───────────────────────────────────────
        addTask(task) {
            set((state) => {
                const col = state.columns[task.status]
                if (!col.find((t) => t.id === task.id)) {
                    col.push(task)
                    state.columns[task.status] = sorted(col)
                }
            })
        },

        updateTaskLocal(taskId, payload) {
            set((state) => {
                for (const status of BOARD_STATUSES) {
                    const idx = state.columns[status].findIndex((t) => t.id === taskId)
                    if (idx !== -1) {
                        const updated = { ...state.columns[status][idx], ...payload }
                        if (payload.status && payload.status !== status) {
                            state.columns[status].splice(idx, 1)
                            state.columns[payload.status as TaskStatus].push(updated as TaskWithAssignee)
                            state.columns[payload.status as TaskStatus] = sorted(
                                state.columns[payload.status as TaskStatus]
                            )
                        } else {
                            state.columns[status][idx] = updated as TaskWithAssignee
                        }
                        break
                    }
                }
            })
        },

        removeTask(taskId) {
            set((state) => {
                for (const status of BOARD_STATUSES) {
                    state.columns[status] = state.columns[status].filter((t) => t.id !== taskId)
                }
            })
        },
    }))
)