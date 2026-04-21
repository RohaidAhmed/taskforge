'use client'

// components/task/TaskTable.tsx
// Full interactive list view with sort, filter, inline status change,
// and task detail sheet on row click.

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import FilterBar from '@/components/shared/FilterBar'
import SortableHeader from '@/components/shared/SortableHeader'
import PriorityBadge from '@/components/shared/PriorityBadge'
import AssigneeAvatar from '@/components/shared/AssigneeAvatar'
import TaskSheetLoader from '@/components/task/TaskSheetLoader'
import CreateTaskModal from '@/components/board/CreateTaskModal'
import { useListFilters } from '@/hooks/useListFilters'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/store/boardStore'
import { formatTaskId, formatDueDate, isOverdue } from '@/lib/utils/format'
import type { TaskWithAssignee, UserProfile, Label, Project } from '@/types/database'
import type { SortField } from '@/lib/db/list'

interface Props {
    project: Project
    initialTasks: TaskWithAssignee[]
    members: UserProfile[]
    labels: Label[]
    currentUser: UserProfile
}

export default function TaskTable({
    project,
    initialTasks,
    members,
    labels,
    currentUser,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const { filters, setFilter, toggleArrayFilter, resetFilters, hasActiveFilters } = useListFilters()

    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [tasks, setTasks] = useState(initialTasks)

    // ── Client-side filtering on top of server results ────────
    // Server already filters by status/priority/assignee/search/due.
    // We re-apply here so toggling filters feels instant without
    // waiting for a server round-trip when initialTasks changes.
    const filteredTasks = tasks.filter(task => {
        if (filters.statuses.length && !filters.statuses.includes(task.status)) return false
        if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false
        if (filters.assigneeIds.length && !filters.assigneeIds.includes(task.assignee_id ?? '')) return false
        if (filters.labelIds.length && !filters.labelIds.some(id => task.labels.some(l => l.id === id))) return false
        if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false
        if (filters.overdue && (!task.due_date || new Date(task.due_date) >= new Date())) return false
        if (filters.dueSoon) {
            if (!task.due_date) return false
            const d = new Date(task.due_date)
            const now = new Date()
            const three = new Date(Date.now() + 3 * 864e5)
            if (d < now || d > three) return false
        }
        return true
    })

    // ── Sort ──────────────────────────────────────────────────
    const PRIORITY_ORDER: Record<string, number> = {
        urgent: 0, high: 1, medium: 2, low: 3, no_priority: 4,
    }

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        const dir = filters.sortDir === 'asc' ? 1 : -1
        switch (filters.sortField) {
            case 'title': return dir * a.title.localeCompare(b.title)
            case 'status': return dir * a.status.localeCompare(b.status)
            case 'priority': return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
            case 'due_date': return dir * ((a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1)
            case 'updated_at': return dir * (a.updated_at < b.updated_at ? -1 : 1)
            default: return dir * (a.created_at < b.created_at ? -1 : 1)
        }
    })

    function handleSort(field: SortField) {
        if (filters.sortField === field) {
            setFilter('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')
        } else {
            setFilter('sortField', field)
            setFilter('sortDir', 'asc')
        }
    }

    function handleTaskCreated(task: TaskWithAssignee) {
        setTasks(prev => [task, ...prev])
        toast.success('Task created')
    }

    // Refresh tasks when sheet closes (field edits are reflected)
    function handleSheetClose() {
        setSelectedTask(null)
        startTransition(() => router.refresh())
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-gray-800/60 flex-shrink-0 flex-wrap">
                <FilterBar
                    filters={filters}
                    members={members}
                    labels={labels}
                    onSearch={q => setFilter('search', q)}
                    onToggleStatus={s => toggleArrayFilter('statuses', s)}
                    onTogglePriority={p => toggleArrayFilter('priorities', p)}
                    onToggleAssignee={id => toggleArrayFilter('assigneeIds', id)}
                    onToggleLabel={id => toggleArrayFilter('labelIds', id)}
                    onToggleDueSoon={() => setFilter('dueSoon', !filters.dueSoon)}
                    onToggleOverdue={() => setFilter('overdue', !filters.overdue)}
                    onReset={resetFilters}
                    hasActiveFilters={hasActiveFilters}
                />

                <button
                    onClick={() => setCreateOpen(true)}
                    className="btn-primary btn-sm h-8 gap-1.5 flex-shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New task
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {isPending && (
                    <div className="flex items-center gap-2 px-6 py-2 text-xs text-gray-600">
                        <Loader2 className="w-3 h-3 animate-spin" /> Refreshing...
                    </div>
                )}

                <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-gray-950 z-10">
                        <tr className="border-b border-gray-800">
                            <th className="text-left py-2.5 px-4 w-20">
                                <SortableHeader field="created_at" label="ID"
                                    currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                            </th>
                            <th className="text-left py-2.5 px-4">
                                <SortableHeader field="title" label="Title"
                                    currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                            </th>
                            <th className="text-left py-2.5 px-4 w-32">
                                <SortableHeader field="status" label="Status"
                                    currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                            </th>
                            <th className="text-left py-2.5 px-4 w-28">
                                <SortableHeader field="priority" label="Priority"
                                    currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                            </th>
                            <th className="text-left py-2.5 px-4 w-28">
                                <SortableHeader field="due_date" label="Due date"
                                    currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                            </th>
                            <th className="text-left py-2.5 px-4 w-32">
                                <span className="text-xs font-medium text-gray-600">Assignee</span>
                            </th>
                            <th className="text-left py-2.5 px-4 w-40">
                                <span className="text-xs font-medium text-gray-600">Labels</span>
                            </th>
                            <th className="text-left py-2.5 px-4 w-28">
                                <SortableHeader field="updated_at" label="Updated"
                                    currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-800/40">
                        {sortedTasks.map(task => {
                            const overdue = isOverdue(task.due_date)
                            return (
                                <tr
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className="hover:bg-gray-800/25 cursor-pointer transition-colors group"
                                >
                                    {/* ID */}
                                    <td className="py-2.5 px-4">
                                        <span className="text-xs font-mono text-gray-600">
                                            {formatTaskId(project.identifier, task.sequence_number)}
                                        </span>
                                    </td>

                                    {/* Title */}
                                    <td className="py-2.5 px-4 max-w-xs">
                                        <span className="text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-1">
                                            {task.title}
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td className="py-2.5 px-4">
                                        <span className={cn('text-xs font-medium', STATUS_COLORS[task.status])}>
                                            {STATUS_LABELS[task.status]}
                                        </span>
                                    </td>

                                    {/* Priority */}
                                    <td className="py-2.5 px-4">
                                        <PriorityBadge priority={task.priority} showLabel />
                                    </td>

                                    {/* Due date */}
                                    <td className="py-2.5 px-4">
                                        {task.due_date ? (
                                            <span className={cn('text-xs', overdue ? 'text-red-400 font-medium' : 'text-gray-500')}>
                                                {formatDueDate(task.due_date)}
                                                {overdue && ' ·  overdue'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-700 text-xs">—</span>
                                        )}
                                    </td>

                                    {/* Assignee */}
                                    <td className="py-2.5 px-4">
                                        <div className="flex items-center gap-2">
                                            <AssigneeAvatar user={task.assignee} size="sm" />
                                            {task.assignee && (
                                                <span className="text-xs text-gray-500 truncate max-w-[80px]">
                                                    {task.assignee.full_name ?? task.assignee.email}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Labels */}
                                    <td className="py-2.5 px-4">
                                        <div className="flex flex-wrap gap-1">
                                            {task.labels.slice(0, 2).map(label => (
                                                <span
                                                    key={label.id}
                                                    className="inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium"
                                                    style={{
                                                        backgroundColor: label.color + '22',
                                                        color: label.color,
                                                        border: `1px solid ${label.color}44`,
                                                    }}
                                                >
                                                    {label.name}
                                                </span>
                                            ))}
                                            {task.labels.length > 2 && (
                                                <span className="text-[10px] text-gray-600">+{task.labels.length - 2}</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Updated */}
                                    <td className="py-2.5 px-4">
                                        <span className="text-xs text-gray-600">
                                            {new Date(task.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {/* Empty state */}
                {sortedTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-sm text-gray-500 mb-1">
                            {hasActiveFilters ? 'No tasks match these filters' : 'No tasks yet'}
                        </p>
                        {hasActiveFilters ? (
                            <button onClick={resetFilters} className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-1">
                                Clear filters
                            </button>
                        ) : (
                            <button onClick={() => setCreateOpen(true)} className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-1">
                                Create the first task
                            </button>
                        )}
                    </div>
                )}

                {/* Row count */}
                {sortedTasks.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-800/40">
                        <p className="text-xs text-gray-700">
                            {sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'}
                            {hasActiveFilters && ` · ${tasks.length} total`}
                        </p>
                    </div>
                )}
            </div>

            {/* Task detail sheet */}
            {selectedTask && (
                <TaskSheetLoader
                    task={selectedTask}
                    projectIdentifier={project.identifier}
                    workspaceMembers={members}
                    workspaceLabels={labels}
                    currentUser={currentUser}
                    onClose={handleSheetClose}
                />
            )}

            {/* Create task modal */}
            {createOpen && (
                <CreateTaskModal
                    projectId={project.id}
                    workspaceId={project.workspace_id}
                    defaultStatus="todo"
                    onCreated={task => handleTaskCreated({ ...task, labels: [], assignee: null })}
                    onClose={() => setCreateOpen(false)}
                />
            )}
        </div>
    )
}