'use client'

// app/[workspaceSlug]/my-tasks/MyTasksClient.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import PriorityBadge from '@/components/shared/PriorityBadge'
import AssigneeAvatar from '@/components/shared/AssigneeAvatar'
import TaskSheetLoader from '@/components/task/TaskSheetLoader'
import { STATUS_LABELS, STATUS_COLORS, BOARD_STATUSES } from '@/lib/store/boardStore'
import { formatDueDate, isOverdue, isDueSoon } from '@/lib/utils/format'
import type { TaskWithAssignee, UserProfile, Label } from '@/types/database'

interface Props {
    initialTasks: TaskWithAssignee[]
    members: UserProfile[]
    labels: Label[]
    currentUser: UserProfile
    workspaceSlug: string
}

export default function MyTasksClient({
    initialTasks, members, labels, currentUser, workspaceSlug,
}: Props) {
    const router = useRouter()
    const [tasks] = useState(initialTasks)
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null)
    const [search, setSearch] = useState('')
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['done', 'cancelled']))

    const filtered = tasks.filter(t =>
        !search || t.title.toLowerCase().includes(search.toLowerCase())
    )

    const grouped = BOARD_STATUSES.reduce((acc, status) => {
        acc[status] = filtered.filter(t => t.status === status)
        return acc
    }, {} as Record<string, TaskWithAssignee[]>)

    const totalActive = filtered.filter(t => !['done', 'cancelled'].includes(t.status)).length

    function toggleCollapse(status: string) {
        setCollapsed(prev => {
            const next = new Set(prev)
            next.has(status) ? next.delete(status) : next.add(status)
            return next
        })
    }

    return (
        <>
            {/* Search + stats */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <input
                    type="text"
                    className="input h-8 text-xs w-56"
                    placeholder="Search my tasks..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <p className="text-xs text-gray-600">
                    {totalActive} active {totalActive === 1 ? 'task' : 'tasks'}
                </p>
            </div>

            {/* Grouped sections */}
            <div className="space-y-2">
                {BOARD_STATUSES.map(status => {
                    const statusTasks = grouped[status]
                    if (statusTasks.length === 0) return null

                    const isCollapsed = collapsed.has(status)

                    return (
                        <div key={status} className="rounded-xl border border-gray-800 overflow-hidden">
                            {/* Section header */}
                            <button
                                onClick={() => toggleCollapse(status)}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900/60 hover:bg-gray-800/40 transition-colors text-left"
                            >
                                {isCollapsed
                                    ? <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                    : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                                }
                                <span className={cn('text-xs font-semibold uppercase tracking-wider', STATUS_COLORS[status])}>
                                    {STATUS_LABELS[status]}
                                </span>
                                <span className="text-xs text-gray-600 font-medium">{statusTasks.length}</span>
                            </button>

                            {/* Task rows */}
                            {!isCollapsed && (
                                <div className="divide-y divide-gray-800/50">
                                    {statusTasks.map(task => {
                                        const overdue = isOverdue(task.due_date)
                                        const dueSoon = isDueSoon(task.due_date)

                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedTask(task)}
                                                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/25 cursor-pointer transition-colors group"
                                            >
                                                <PriorityBadge priority={task.priority} />

                                                <p className="flex-1 text-sm text-gray-200 group-hover:text-white transition-colors min-w-0 truncate">
                                                    {task.title}
                                                </p>

                                                {task.due_date && (
                                                    <span className={cn(
                                                        'text-xs flex-shrink-0',
                                                        overdue ? 'text-red-400 font-medium' : dueSoon ? 'text-yellow-400' : 'text-gray-600'
                                                    )}>
                                                        {formatDueDate(task.due_date)}
                                                    </span>
                                                )}

                                                {task.labels.slice(0, 2).map(label => (
                                                    <span
                                                        key={label.id}
                                                        className="hidden sm:inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium flex-shrink-0"
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
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-sm text-gray-500">
                        {search ? 'No tasks match your search.' : 'No tasks assigned to you. 🎉'}
                    </p>
                </div>
            )}

            {/* Task detail sheet */}
            {selectedTask && (
                <TaskSheetLoader
                    task={selectedTask}
                    projectIdentifier={selectedTask.project_id.slice(0, 4).toUpperCase()}
                    workspaceMembers={members}
                    workspaceLabels={labels}
                    currentUser={currentUser}
                    onClose={() => { setSelectedTask(null); router.refresh() }}
                />
            )}
        </>
    )
}