'use client'

// components/board/CreateTaskModal.tsx
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/store/boardStore'
import type { TaskStatus, TaskPriority, TaskWithAssignee } from '@/types/database'

const PRIORITIES: { value: TaskPriority; label: string }[] = [
    { value: 'no_priority', label: 'No priority' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
]

interface Props {
    projectId: string
    workspaceId: string
    defaultStatus: TaskStatus
    onCreated: (task: TaskWithAssignee) => void
    onClose: () => void
}

export default function CreateTaskModal({
    projectId,
    workspaceId,
    defaultStatus,
    onCreated,
    onClose,
}: Props) {
    const [title, setTitle] = useState('')
    const [status, setStatus] = useState<TaskStatus>(defaultStatus)
    const [priority, setPriority] = useState<TaskPriority>('no_priority')
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim()) return
        setLoading(true)

        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, workspace_id: workspaceId, title, status, priority }),
        })

        const json = await res.json()
        setLoading(false)

        if (!res.ok) {
            toast.error(json.error ?? 'Failed to create task')
            return
        }

        onCreated({ ...json, labels: [], assignee: null } as TaskWithAssignee)
        toast.success('Task created')
        onClose()
    }

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="w-full max-w-md card p-6 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-semibold text-gray-200">New task</h2>
                    <button onClick={onClose} className="btn-ghost btn-sm p-1.5 rounded-md">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        ref={inputRef}
                        type="text"
                        className="input text-sm"
                        placeholder="Task title..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />

                    <div className="flex gap-3">
                        {/* Status */}
                        <div className="flex-1 space-y-1.5">
                            <label className="label">Status</label>
                            <select
                                className="input text-xs"
                                value={status}
                                onChange={e => setStatus(e.target.value as TaskStatus)}
                            >
                                {(['backlog', 'todo', 'in_progress', 'in_review', 'done'] as TaskStatus[]).map(s => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="flex-1 space-y-1.5">
                            <label className="label">Priority</label>
                            <select
                                className="input text-xs"
                                value={priority}
                                onChange={e => setPriority(e.target.value as TaskPriority)}
                            >
                                {PRIORITIES.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="btn-secondary btn-md">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || !title.trim()} className="btn-primary btn-md">
                            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Create task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}