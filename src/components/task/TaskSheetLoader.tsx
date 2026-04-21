'use client'

// components/task/TaskSheetLoader.tsx
// Client component that fetches comments + activity when sheet opens,
// then renders TaskDetailSheet. Keeps the board page fully server-rendered.

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import TaskDetailSheet from './TaskDetailSheet'
import type {
    TaskWithAssignee,
    CommentWithAuthor,
    ActivityLogWithUser,
    UserProfile,
    Label,
} from '@/types/database'

interface Props {
    task: TaskWithAssignee
    projectIdentifier: string
    workspaceMembers: UserProfile[]
    workspaceLabels: Label[]
    currentUser: UserProfile
    onClose: () => void
}

export default function TaskSheetLoader({
    task,
    projectIdentifier,
    workspaceMembers,
    workspaceLabels,
    currentUser,
    onClose,
}: Props) {
    const [comments, setComments] = useState<CommentWithAuthor[] | null>(null)
    const [activity, setActivity] = useState<ActivityLogWithUser[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const [commentsRes, activityRes] = await Promise.all([
                    fetch(`/api/tasks/${task.id}/comments`),
                    fetch(`/api/tasks/${task.id}/activity`),
                ])

                if (cancelled) return

                if (!commentsRes.ok || !activityRes.ok) {
                    setError('Failed to load task details.')
                    return
                }

                const [commentsData, activityData] = await Promise.all([
                    commentsRes.json(),
                    activityRes.json(),
                ])

                if (!cancelled) {
                    setComments(commentsData)
                    setActivity(activityData)
                }
            } catch {
                if (!cancelled) setError('Network error.')
            }
        }

        load()
        return () => { cancelled = true }
    }, [task.id])

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                <div className="relative z-10 w-full max-w-2xl h-full bg-gray-950 border-l border-gray-800 flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <p className="text-sm text-red-400">{error}</p>
                        <button onClick={onClose} className="btn-secondary btn-sm">Close</button>
                    </div>
                </div>
            </div>
        )
    }

    if (!comments || !activity) {
        return (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                <div className="relative z-10 w-full max-w-2xl h-full bg-gray-950 border-l border-gray-800 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                </div>
            </div>
        )
    }

    return (
        <TaskDetailSheet
            task={task}
            projectIdentifier={projectIdentifier}
            workspaceMembers={workspaceMembers}
            workspaceLabels={workspaceLabels}
            currentUser={currentUser}
            initialComments={comments}
            initialActivity={activity}
            onClose={onClose}
        />
    )
}