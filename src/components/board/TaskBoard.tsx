'use client'

// components/board/TaskBoard.tsx
import { useEffect, useState, useCallback } from 'react'
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragOverEvent,
    type DragEndEvent,
    closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { toast } from 'sonner'

import TaskColumn from './TaskColumn'
import TaskCard from './TaskCard'
import CreateTaskModal from './CreateTaskModal'

import { useBoardStore, BOARD_STATUSES } from '@/lib/store/boardStore'
import { subscribeToProject } from '@/lib/supabase/realtime'

import type { TaskWithAssignee, TaskStatus, Project } from '@/types/database'

interface Props {
    project: Project
    initialTasks: TaskWithAssignee[]
}

export default function TaskBoard({ project, initialTasks }: Props) {
    const {
        columns,
        initBoard,
        moveTask,
        rollbackMove,
        getSnapshot,
        addTask,
        onTaskInserted,
        onTaskUpdated,
        onTaskDeleted,
    } = useBoardStore()

    const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null)
    const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null)

    // ── Init board ────────────────────────────────────────────
    useEffect(() => {
        initBoard(project.id, initialTasks)
    }, [project.id]) // eslint-disable-line

    // ── Realtime subscription ─────────────────────────────────
    useEffect(() => {
        const unsub = subscribeToProject<TaskWithAssignee>(
            project.id,
            'tasks',
            (payload) => {
                if (payload.eventType === 'INSERT') onTaskInserted(payload.new)
                if (payload.eventType === 'UPDATE') onTaskUpdated(payload.new)
                if (payload.eventType === 'DELETE') onTaskDeleted((payload.old as { id: string }).id)
            }
        )
        return unsub
    }, [project.id]) // eslint-disable-line

    // ── DnD sensors ──────────────────────────────────────────
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    )

    function onDragStart({ active }: DragStartEvent) {
        const task = active.data.current?.task as TaskWithAssignee | undefined
        if (task) setActiveTask(task)
    }

    function onDragOver({ active, over }: DragOverEvent) {
        if (!over) return
        const activeTask = active.data.current?.task as TaskWithAssignee | undefined
        if (!activeTask) return

        const overType = over.data.current?.type
        const overStatus: TaskStatus =
            overType === 'Column'
                ? (over.id as TaskStatus)
                : (over.data.current?.task as TaskWithAssignee)?.status

        if (!overStatus || activeTask.status === overStatus) return

        // Cross-column move preview (visual only — no API yet)
        moveTask(activeTask.id, activeTask.status, overStatus, null, null)
    }

    async function onDragEnd({ active, over }: DragEndEvent) {
        setActiveTask(null)
        if (!over) return

        const activeData = active.data.current?.task as TaskWithAssignee | undefined
        if (!activeData) return

        const overType = over.data.current?.type
        const overTask = over.data.current?.task as TaskWithAssignee | undefined
        const toStatus: TaskStatus =
            overType === 'Column'
                ? (over.id as TaskStatus)
                : overTask?.status ?? activeData.status

        // Find neighbors in the target column
        const colTasks = columns[toStatus]
        const overIdx = overTask ? colTasks.findIndex((t) => t.id === overTask.id) : -1
        const overTaskId = overIdx > 0 ? colTasks[overIdx - 1].id : null
        const belowTaskId = overIdx >= 0 && overIdx < colTasks.length - 1
            ? colTasks[overIdx + 1].id
            : null

        // Take snapshot before optimistic update
        const snapshot = getSnapshot()

        // Optimistic move
        moveTask(activeData.id, activeData.status, toStatus, overTaskId, belowTaskId)

        // Persist to API
        const res = await fetch(`/api/tasks/${activeData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                _action: 'reorder',
                newStatus: toStatus,
                overTaskId,
                belowTaskId,
            }),
        })

        if (!res.ok) {
            rollbackMove(snapshot)
            toast.error('Failed to move task')
        }
    }

    const handleTaskCreated = useCallback((task: TaskWithAssignee) => {
        addTask(task)
    }, [addTask])

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                {/* Board scroll area */}
                <div className="flex gap-4 h-full overflow-x-auto px-6 py-5 group">
                    {BOARD_STATUSES.map((status) => (
                        <TaskColumn
                            key={status}
                            status={status}
                            tasks={columns[status]}
                            projectIdentifier={project.identifier}
                            onAddTask={setCreateStatus}
                            onTaskClick={(task) => {
                                // Sprint 3: open task detail sheet
                                console.log('open task', task.id)
                            }}
                            activeTaskId={activeTask?.id ?? null}
                        />
                    ))}
                </div>

                {/* Drag overlay — ghost card */}
                <DragOverlay>
                    {activeTask && (
                        <div className="rotate-1 scale-105 opacity-90 shadow-2xl">
                            <TaskCard
                                task={activeTask}
                                projectIdentifier={project.identifier}
                                onClick={() => { }}
                                isDragging
                            />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Create task modal */}
            {createStatus && (
                <CreateTaskModal
                    projectId={project.id}
                    workspaceId={project.workspace_id}
                    defaultStatus={createStatus}
                    onCreated={handleTaskCreated}
                    onClose={() => setCreateStatus(null)}
                />
            )}
        </>
    )
}