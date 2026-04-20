'use client'

// components/board/TaskColumn.tsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils/cn'
import TaskCard from './TaskCard'
import { Plus } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/store/boardStore'
import type { TaskWithAssignee, TaskStatus } from '@/types/database'

interface Props {
    status: TaskStatus
    tasks: TaskWithAssignee[]
    projectIdentifier: string
    onAddTask: (status: TaskStatus) => void
    onTaskClick: (task: TaskWithAssignee) => void
    activeTaskId: string | null
}

export default function TaskColumn({
    status,
    tasks,
    projectIdentifier,
    onAddTask,
    onTaskClick,
    activeTaskId,
}: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'Column', status } })

    return (
        <div className="flex flex-col w-72 flex-shrink-0">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold uppercase tracking-wider', STATUS_COLORS[status])}>
                        {STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs text-gray-600 font-medium tabular-nums">
                        {tasks.length}
                    </span>
                </div>
                <button
                    onClick={() => onAddTask(status)}
                    className="btn-ghost btn-sm p-1 rounded opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
                    title={`Add task to ${STATUS_LABELS[status]}`}
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Drop zone */}
            <div
                ref={setNodeRef}
                className={cn(
                    'flex-1 flex flex-col gap-2 rounded-xl p-2 min-h-[120px] transition-colors duration-150',
                    isOver ? 'bg-brand-600/10 ring-1 ring-brand-500/30' : 'bg-gray-900/40'
                )}
            >
                <SortableContext
                    items={tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            projectIdentifier={projectIdentifier}
                            onClick={onTaskClick}
                            isDragging={task.id === activeTaskId}
                        />
                    ))}
                </SortableContext>

                {/* Empty state */}
                {tasks.length === 0 && !isOver && (
                    <button
                        onClick={() => onAddTask(status)}
                        className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-gray-800 hover:border-gray-700 text-gray-700 hover:text-gray-500 transition-colors min-h-[80px]"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    )
}