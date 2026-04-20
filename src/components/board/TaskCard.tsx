'use client'

// components/board/TaskCard.tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils/cn'
import PriorityBadge from '@/components/shared/PriorityBadge'
import AssigneeAvatar from '@/components/shared/AssigneeAvatar'
import { formatTaskId, formatDueDate, isOverdue, isDueSoon } from '@/lib/utils/format'
import { CalendarDays, MessageSquare } from 'lucide-react'
import type { TaskWithAssignee } from '@/types/database'

interface Props {
    task: TaskWithAssignee
    projectIdentifier: string
    onClick: (task: TaskWithAssignee) => void
    isDragging?: boolean
}

export default function TaskCard({ task, projectIdentifier, onClick, isDragging }: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: task.id, data: { task, type: 'Task' } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const overdue = isOverdue(task.due_date)
    const dueSoon = isDueSoon(task.due_date)

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(task)}
            className={cn(
                'group relative rounded-lg border bg-gray-900 border-gray-800 px-3.5 py-3 cursor-pointer',
                'hover:border-gray-700 hover:bg-gray-850 transition-all duration-150',
                'select-none touch-none',
                isSortableDragging && 'opacity-40 shadow-2xl ring-1 ring-brand-500/50 scale-[0.98]',
                isDragging && 'opacity-40'
            )}
        >
            {/* Priority indicator — left edge */}
            <div className={cn(
                'absolute left-0 top-3 bottom-3 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity',
                task.priority === 'urgent' && 'bg-red-500 opacity-100',
                task.priority === 'high' && 'bg-orange-500 opacity-100',
            )} />

            {/* Title */}
            <p className="text-sm text-gray-200 leading-snug mb-2.5 pr-1">
                {task.title}
            </p>

            {/* Labels */}
            {task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2.5">
                    {task.labels.map(label => (
                        <span
                            key={label.id}
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                                backgroundColor: label.color + '22',
                                color: label.color,
                                border: `1px solid ${label.color}44`,
                            }}
                        >
                            {label.name}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[10px] text-gray-600 font-mono">
                        {formatTaskId(projectIdentifier, task.sequence_number)}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {task.due_date && (
                        <span className={cn(
                            'inline-flex items-center gap-1 text-[10px]',
                            overdue ? 'text-red-400' : dueSoon ? 'text-yellow-400' : 'text-gray-600'
                        )}>
                            <CalendarDays className="w-3 h-3" />
                            {formatDueDate(task.due_date)}
                        </span>
                    )}
                    <AssigneeAvatar user={task.assignee} size="sm" />
                </div>
            </div>
        </div>
    )
}