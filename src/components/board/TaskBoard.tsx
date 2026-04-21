'use client'

// components/board/TaskBoard.tsx  (REPLACES Sprint 2 version)
import { useEffect, useState, useCallback } from 'react'
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    type DragStartEvent, type DragOverEvent, type DragEndEvent, closestCorners,
} from '@dnd-kit/core'
import { toast } from 'sonner'

import TaskColumn from './TaskColumn'
import TaskCard from './TaskCard'
import CreateTaskModal from './CreateTaskModal'
import TaskSheetLoader from '@/components/task/TaskSheetLoader'

import { useBoardStore, BOARD_STATUSES } from '@/lib/store/boardStore'
import { subscribeToProject } from '@/lib/supabase/realtime'

import type { TaskWithAssignee, TaskStatus, Project, UserProfile, Label } from '@/types/database'

interface Props {
    project: Project
    initialTasks: TaskWithAssignee[]
    workspaceMembers: UserProfile[]
    workspaceLabels: Label[]
    currentUser: UserProfile
}

export default function TaskBoard({
    project,
    initialTasks,
    workspaceMembers,
    workspaceLabels,
    currentUser,
}: Props) {
    const {
        columns, initBoard, moveTask, rollbackMove,
        getSnapshot, addTask, onTaskInserted, onTaskUpdated, onTaskDeleted,
    } = useBoardStore()

    const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null)
    const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null)
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null)

    useEffect(() => { initBoard(project.id, initialTasks) }, [project.id]) // eslint-disable-line

    useEffect(() => {
        const unsub = subscribeToProject<TaskWithAssignee>(project.id, 'tasks', (payload) => {
            if (payload.eventType === 'INSERT') onTaskInserted(payload.new)
            if (payload.eventType === 'UPDATE') onTaskUpdated(payload.new)
            if (payload.eventType === 'DELETE') onTaskDeleted((payload.old as { id: string }).id)
        })
        return unsub
    }, [project.id]) // eslint-disable-line

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
            overType === 'Column' ? (over.id as TaskStatus) : overTask?.status ?? activeData.status

        const colTasks = columns[toStatus]
        const overIdx = overTask ? colTasks.findIndex(t => t.id === overTask.id) : -1
        const overTaskId = overIdx > 0 ? colTasks[overIdx - 1].id : null
        const belowTaskId = overIdx >= 0 && overIdx < colTasks.length - 1 ? colTasks[overIdx + 1].id : null

        const snapshot = getSnapshot()
        moveTask(activeData.id, activeData.status, toStatus, overTaskId, belowTaskId)

        const res = await fetch(`/api/tasks/${activeData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _action: 'reorder', newStatus: toStatus, overTaskId, belowTaskId }),
        })

        if (!res.ok) { rollbackMove(snapshot); toast.error('Failed to move task') }
    }

    const handleTaskCreated = useCallback((task: TaskWithAssignee) => { addTask(task) }, [addTask])
    const handleTaskClick = useCallback((task: TaskWithAssignee) => { setSelectedTask(task) }, [])

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                <div className="flex gap-4 h-full overflow-x-auto px-6 py-5 group">
                    {BOARD_STATUSES.map(status => (
                        <TaskColumn
                            key={status}
                            status={status}
                            tasks={columns[status]}
                            projectIdentifier={project.identifier}
                            onAddTask={setCreateStatus}
                            onTaskClick={handleTaskClick}
                            activeTaskId={activeTask?.id ?? null}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask && (
                        <div className="rotate-1 scale-105 opacity-90 shadow-2xl">
                            <TaskCard task={activeTask} projectIdentifier={project.identifier} onClick={() => { }} isDragging />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {createStatus && (
                <CreateTaskModal
                    projectId={project.id}
                    workspaceId={project.workspace_id}
                    defaultStatus={createStatus}
                    onCreated={handleTaskCreated}
                    onClose={() => setCreateStatus(null)}
                />
            )}

            {selectedTask && (
                <TaskSheetLoader
                    task={selectedTask}
                    projectIdentifier={project.identifier}
                    workspaceMembers={workspaceMembers}
                    workspaceLabels={workspaceLabels}
                    currentUser={currentUser}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </>
    )
}