// components/shared/PriorityBadge.tsx
import { cn } from '@/lib/utils/cn'
import type { TaskPriority } from '@/types/database'

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string; dot: string }> = {
    urgent: { label: 'Urgent', className: 'text-red-400', dot: 'bg-red-400' },
    high: { label: 'High', className: 'text-orange-400', dot: 'bg-orange-400' },
    medium: { label: 'Medium', className: 'text-yellow-400', dot: 'bg-yellow-400' },
    low: { label: 'Low', className: 'text-blue-400', dot: 'bg-blue-400' },
    no_priority: { label: 'No priority', className: 'text-gray-600', dot: 'bg-gray-600' },
}

interface Props {
    priority: TaskPriority
    showLabel?: boolean
    className?: string
}

export default function PriorityBadge({ priority, showLabel = false, className }: Props) {
    const config = PRIORITY_CONFIG[priority]
    return (
        <span className={cn('inline-flex items-center gap-1.5', config.className, className)}>
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
            {showLabel && <span className="text-xs">{config.label}</span>}
        </span>
    )
}