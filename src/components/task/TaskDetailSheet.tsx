'use client'

// components/task/TaskDetailSheet.tsx
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
    X, Calendar, User, Tag, Flag, Hash,
    ChevronDown, Loader2, Trash2, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatTaskId, formatDueDate, isOverdue, timeAgo } from '@/lib/utils/format'
import AssigneeAvatar from '@/components/shared/AssigneeAvatar'
import PriorityBadge from '@/components/shared/PriorityBadge'
import CommentThread from './CommentThread'
import ActivityFeed from './ActivityFeed'
import TaskEditor from './TaskEditor'
import { STATUS_LABELS, STATUS_COLORS, BOARD_STATUSES } from '@/lib/store/boardStore'
import { useBoardStore } from '@/lib/store/boardStore'
import type {
    TaskWithAssignee,
    CommentWithAuthor,
    ActivityLogWithUser,
    UserProfile,
    Label,
    TaskStatus,
    TaskPriority,
    TiptapDoc,
} from '@/types/database'

// ── Priority options ──────────────────────────────────────────
const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'low', label: 'Low', color: 'text-blue-400' },
    { value: 'no_priority', label: 'No priority', color: 'text-gray-600' },
]

interface Props {
    task: TaskWithAssignee
    projectIdentifier: string
    workspaceMembers: UserProfile[]
    workspaceLabels: Label[]
    currentUser: UserProfile
    initialComments: CommentWithAuthor[]
    initialActivity: ActivityLogWithUser[]
    onClose: () => void
}

type Tab = 'comments' | 'activity'

export default function TaskDetailSheet({
    task: initialTask,
    projectIdentifier,
    workspaceMembers,
    workspaceLabels,
    currentUser,
    initialComments,
    initialActivity,
    onClose,
}: Props) {
    const { updateTaskLocal, removeTask } = useBoardStore()

    const [task, setTask] = useState(initialTask)
    const [tab, setTab] = useState<Tab>('comments')
    const [titleValue, setTitleValue] = useState(task.title)
    const [titleEditing, setTitleEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Dropdown states
    const [statusOpen, setStatusOpen] = useState(false)
    const [priorityOpen, setPriorityOpen] = useState(false)
    const [assigneeOpen, setAssigneeOpen] = useState(false)
    const [labelOpen, setLabelOpen] = useState(false)

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    // ── Generic field updater ─────────────────────────────────
    const updateField = useCallback(async (payload: Partial<TaskWithAssignee>) => {
        setSaving(true)
        const res = await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        setSaving(false)

        if (!res.ok) {
            const json = await res.json()
            toast.error(json.error ?? 'Failed to update task')
            return
        }

        const updated = { ...task, ...payload }
        setTask(updated as TaskWithAssignee)
        updateTaskLocal(task.id, payload)
    }, [task, updateTaskLocal])

    // ── Title save ────────────────────────────────────────────
    async function saveTitle() {
        const trimmed = titleValue.trim()
        if (!trimmed || trimmed === task.title) { setTitleEditing(false); return }
        setTitleEditing(false)
        await updateField({ title: trimmed })
    }

    // ── Description save (Tiptap onBlur) ─────────────────────
    async function saveDescription(doc: TiptapDoc | null) {
        await updateField({ description: doc ?? undefined })
    }

    // ── Status ────────────────────────────────────────────────
    async function handleStatus(status: TaskStatus) {
        setStatusOpen(false)
        await updateField({ status })
    }

    // ── Priority ──────────────────────────────────────────────
    async function handlePriority(priority: TaskPriority) {
        setPriorityOpen(false)
        await updateField({ priority })
    }

    // ── Assignee ──────────────────────────────────────────────
    async function handleAssignee(userId: string | null) {
        setAssigneeOpen(false)
        const assignee = workspaceMembers.find(m => m.id === userId) ?? null
        await updateField({ assignee_id: userId, assignee } as Partial<TaskWithAssignee>)
    }

    // ── Due date ──────────────────────────────────────────────
    async function handleDueDate(date: string) {
        await updateField({ due_date: date || null })
    }

    // ── Labels ────────────────────────────────────────────────
    const taskLabelIds = new Set(task.labels.map(l => l.id))

    async function toggleLabel(label: Label) {
        const hasLabel = taskLabelIds.has(label.id)
        const method = hasLabel ? 'DELETE' : 'POST'

        const res = await fetch(`/api/tasks/${task.id}/labels`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label_id: label.id }),
        })

        if (!res.ok) { toast.error('Failed to update label'); return }

        const newLabels = hasLabel
            ? task.labels.filter(l => l.id !== label.id)
            : [...task.labels, label]

        const updated = { ...task, labels: newLabels }
        setTask(updated)
        updateTaskLocal(task.id, { labels: newLabels } as Partial<TaskWithAssignee>)
    }

    // ── Delete task ───────────────────────────────────────────
    async function handleDelete() {
        if (!confirm('Delete this task? This cannot be undone.')) return
        setDeleting(true)
        const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
        if (!res.ok) { toast.error('Failed to delete task'); setDeleting(false); return }
        removeTask(task.id)
        toast.success('Task deleted')
        onClose()
    }

    const overdue = isOverdue(task.due_date)

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-50 flex justify-end"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            {/* Dim */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* Sheet */}
            <div className="relative z-10 flex flex-col w-full max-w-2xl h-full bg-gray-950 border-l border-gray-800 shadow-2xl animate-slide-in-right overflow-hidden">

                {/* ── Header ───────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-600">
                            {formatTaskId(projectIdentifier, task.sequence_number)}
                        </span>
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="btn-ghost btn-sm p-1.5 text-gray-600 hover:text-red-400"
                            title="Delete task"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                        <button onClick={onClose} className="btn-ghost btn-sm p-1.5">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Scrollable body ───────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-5 space-y-6">

                        {/* ── Title ──────────────────────────────────────── */}
                        {titleEditing ? (
                            <input
                                type="text"
                                className="w-full text-xl font-semibold text-gray-100 bg-transparent border-b border-brand-500/60 outline-none pb-1"
                                value={titleValue}
                                onChange={e => setTitleValue(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleValue(task.title); setTitleEditing(false) } }}
                                autoFocus
                            />
                        ) : (
                            <h1
                                className="text-xl font-semibold text-gray-100 cursor-text hover:text-white transition-colors leading-snug"
                                onClick={() => setTitleEditing(true)}
                                title="Click to edit"
                            >
                                {task.title}
                            </h1>
                        )}

                        {/* ── Properties grid ────────────────────────────── */}
                        <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">

                            {/* Status */}
                            <span className="flex items-center gap-2 text-gray-600 text-xs">
                                <Hash className="w-3.5 h-3.5" /> Status
                            </span>
                            <div className="relative">
                                <button
                                    onClick={() => setStatusOpen(v => !v)}
                                    className={cn('flex items-center gap-1.5 text-xs font-medium hover:bg-gray-800/60 px-2 py-1 rounded-md transition-colors', STATUS_COLORS[task.status])}
                                >
                                    {STATUS_LABELS[task.status]}
                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>
                                {statusOpen && (
                                    <div className="absolute left-0 top-full mt-1 z-20 w-40 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                                        {BOARD_STATUSES.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleStatus(s)}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-gray-800/60',
                                                    STATUS_COLORS[s],
                                                    task.status === s && 'bg-gray-800/40'
                                                )}
                                            >
                                                {STATUS_LABELS[s]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Priority */}
                            <span className="flex items-center gap-2 text-gray-600 text-xs">
                                <Flag className="w-3.5 h-3.5" /> Priority
                            </span>
                            <div className="relative">
                                <button
                                    onClick={() => setPriorityOpen(v => !v)}
                                    className="flex items-center gap-1.5 text-xs font-medium hover:bg-gray-800/60 px-2 py-1 rounded-md transition-colors"
                                >
                                    <PriorityBadge priority={task.priority} showLabel />
                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>
                                {priorityOpen && (
                                    <div className="absolute left-0 top-full mt-1 z-20 w-36 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                                        {PRIORITIES.map(p => (
                                            <button
                                                key={p.value}
                                                onClick={() => handlePriority(p.value)}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-gray-800/60',
                                                    p.color,
                                                    task.priority === p.value && 'bg-gray-800/40'
                                                )}
                                            >
                                                <PriorityBadge priority={p.value} />
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Assignee */}
                            <span className="flex items-center gap-2 text-gray-600 text-xs">
                                <User className="w-3.5 h-3.5" /> Assignee
                            </span>
                            <div className="relative">
                                <button
                                    onClick={() => setAssigneeOpen(v => !v)}
                                    className="flex items-center gap-2 text-xs hover:bg-gray-800/60 px-2 py-1 rounded-md transition-colors"
                                >
                                    <AssigneeAvatar user={task.assignee} size="sm" />
                                    <span className="text-gray-300">
                                        {task.assignee?.full_name ?? task.assignee?.email ?? 'Unassigned'}
                                    </span>
                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>
                                {assigneeOpen && (
                                    <div className="absolute left-0 top-full mt-1 z-20 w-52 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1 max-h-48 overflow-y-auto">
                                        <button
                                            onClick={() => handleAssignee(null)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-800/60"
                                        >
                                            Unassigned
                                        </button>
                                        {workspaceMembers.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => handleAssignee(member.id)}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800/60',
                                                    task.assignee_id === member.id && 'bg-gray-800/40'
                                                )}
                                            >
                                                <AssigneeAvatar user={member} size="sm" />
                                                {member.full_name ?? member.email}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Due date */}
                            <span className="flex items-center gap-2 text-gray-600 text-xs">
                                <Calendar className="w-3.5 h-3.5" /> Due date
                            </span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    className={cn(
                                        'bg-transparent text-xs border-0 outline-none cursor-pointer hover:bg-gray-800/60 px-2 py-1 rounded-md transition-colors',
                                        overdue ? 'text-red-400' : 'text-gray-300'
                                    )}
                                    value={task.due_date ?? ''}
                                    onChange={e => handleDueDate(e.target.value)}
                                />
                                {task.due_date && (
                                    <button
                                        onClick={() => handleDueDate('')}
                                        className="text-gray-700 hover:text-gray-500 text-xs"
                                        title="Clear due date"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Labels */}
                            <span className="flex items-center gap-2 text-gray-600 text-xs">
                                <Tag className="w-3.5 h-3.5" /> Labels
                            </span>
                            <div className="relative">
                                <button
                                    onClick={() => setLabelOpen(v => !v)}
                                    className="flex items-center flex-wrap gap-1.5 hover:bg-gray-800/60 px-2 py-1 rounded-md transition-colors min-h-[28px]"
                                >
                                    {task.labels.length === 0 ? (
                                        <span className="text-xs text-gray-600">None</span>
                                    ) : (
                                        task.labels.map(label => (
                                            <span
                                                key={label.id}
                                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                                                style={{
                                                    backgroundColor: label.color + '22',
                                                    color: label.color,
                                                    border: `1px solid ${label.color}44`,
                                                }}
                                            >
                                                {label.name}
                                            </span>
                                        ))
                                    )}
                                    <ChevronDown className="w-3 h-3 opacity-60 text-gray-600" />
                                </button>
                                {labelOpen && (
                                    <div className="absolute left-0 top-full mt-1 z-20 w-44 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                                        {workspaceLabels.length === 0 ? (
                                            <p className="px-3 py-2 text-xs text-gray-600">No labels yet</p>
                                        ) : workspaceLabels.map(label => (
                                            <button
                                                key={label.id}
                                                onClick={() => toggleLabel(label)}
                                                className={cn(
                                                    'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-gray-800/60',
                                                    taskLabelIds.has(label.id) && 'bg-gray-800/30'
                                                )}
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                                                <span className="text-gray-300 flex-1 text-left">{label.name}</span>
                                                {taskLabelIds.has(label.id) && (
                                                    <span className="text-gray-500 text-[10px]">✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Created */}
                            <span className="flex items-center gap-2 text-gray-600 text-xs">
                                Created
                            </span>
                            <span className="text-xs text-gray-600 px-2 py-1">
                                {timeAgo(task.created_at)}
                            </span>
                        </div>

                        {/* ── Description ────────────────────────────────── */}
                        <div>
                            <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">Description</p>
                            <TaskEditor
                                initialContent={task.description}
                                onSave={saveDescription}
                            />
                        </div>

                        {/* ── Tabs: Comments / Activity ───────────────────── */}
                        <div>
                            <div className="flex items-center gap-1 border-b border-gray-800 mb-4">
                                {(['comments', 'activity'] as Tab[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={cn(
                                            'px-3 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px',
                                            tab === t
                                                ? 'border-brand-500 text-gray-200'
                                                : 'border-transparent text-gray-600 hover:text-gray-400'
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            {tab === 'comments' ? (
                                <CommentThread
                                    taskId={task.id}
                                    initialComments={initialComments}
                                    currentUser={currentUser}
                                />
                            ) : (
                                <ActivityFeed activity={initialActivity} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}