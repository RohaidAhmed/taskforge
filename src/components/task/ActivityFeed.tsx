'use client'

// components/task/ActivityFeed.tsx
import { timeAgo } from '@/lib/utils/format'
import AssigneeAvatar from '@/components/shared/AssigneeAvatar'
import type { ActivityLogWithUser, ActivityType } from '@/types/database'

interface Props {
    activity: ActivityLogWithUser[]
}

function activityLabel(type: ActivityType, meta: Record<string, unknown>): string {
    switch (type) {
        case 'task_created': return 'created this task'
        case 'task_deleted': return 'deleted this task'
        case 'task_status_changed': return `moved from ${fmt(meta.from as string)} to ${fmt(meta.to as string)}`
        case 'task_priority_changed': return `changed priority from ${fmt(meta.from as string)} to ${fmt(meta.to as string)}`
        case 'task_assigned': return 'assigned this task'
        case 'task_unassigned': return 'unassigned this task'
        case 'task_due_date_set': return `set due date to ${meta.due_date}`
        case 'task_due_date_removed': return 'removed the due date'
        case 'task_label_added': return `added label "${meta.label_name}"`
        case 'task_label_removed': return `removed label "${meta.label_name}"`
        case 'comment_added': return 'left a comment'
        case 'comment_deleted': return 'deleted a comment'
        default: return 'updated this task'
    }
}

function fmt(value: string): string {
    return value.replace(/_/g, ' ')
}

export default function ActivityFeed({ activity }: Props) {
    if (activity.length === 0) {
        return <p className="text-xs text-gray-600 py-2">No activity yet.</p>
    }

    return (
        <div className="space-y-3">
            {activity.map((entry, i) => (
                <div key={entry.id} className="flex gap-3 items-start">
                    {/* Avatar */}
                    <AssigneeAvatar user={entry.user} size="sm" className="mt-0.5 flex-shrink-0" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 leading-relaxed">
                            <span className="font-medium text-gray-300">
                                {entry.user.full_name ?? entry.user.email}
                            </span>
                            {' '}
                            <span className="text-gray-500">{activityLabel(entry.type, entry.meta as Record<string, unknown>)}</span>
                        </p>
                        <p className="text-[10px] text-gray-700 mt-0.5">{timeAgo(entry.created_at)}</p>
                    </div>

                    {/* Connector line (not last) */}
                    {i < activity.length - 1 && (
                        <div className="absolute left-[22px] mt-5 w-px h-3 bg-gray-800" />
                    )}
                </div>
            ))}
        </div>
    )
}