'use client'

// components/shared/FilterBar.tsx
import { useRef, useState } from 'react'
import {
    Search, X, ChevronDown, SlidersHorizontal,
    AlertCircle, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import AssigneeAvatar from './AssigneeAvatar'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/store/boardStore'
import type { TaskStatus, TaskPriority, UserProfile, Label } from '@/types/database'
import type { FilterState } from '@/hooks/useListFilters'

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'low', label: 'Low', color: 'text-blue-400' },
    { value: 'no_priority', label: 'No priority', color: 'text-gray-600' },
]

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']

interface Props {
    filters: FilterState
    members: UserProfile[]
    labels: Label[]
    onSearch: (q: string) => void
    onToggleStatus: (s: TaskStatus) => void
    onTogglePriority: (p: TaskPriority) => void
    onToggleAssignee: (id: string) => void
    onToggleLabel: (id: string) => void
    onToggleDueSoon: () => void
    onToggleOverdue: () => void
    onReset: () => void
    hasActiveFilters: boolean
}

type DropdownKey = 'status' | 'priority' | 'assignee' | 'label' | null

export default function FilterBar({
    filters, members, labels,
    onSearch, onToggleStatus, onTogglePriority,
    onToggleAssignee, onToggleLabel,
    onToggleDueSoon, onToggleOverdue,
    onReset, hasActiveFilters,
}: Props) {
    const [open, setOpen] = useState<DropdownKey>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    function toggle(key: DropdownKey) {
        setOpen(prev => prev === key ? null : key)
    }

    // Helper: count active filters for a pill
    const badge = (count: number) => count > 0
        ? <span className="ml-1 px-1.5 py-px text-[10px] rounded-full bg-brand-600 text-white font-medium">{count}</span>
        : null

    return (
        <div className="flex items-center gap-2 flex-wrap">

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                <input
                    ref={searchRef}
                    type="text"
                    className="input pl-8 h-8 text-xs w-48 focus:w-64 transition-all duration-200"
                    placeholder="Search tasks..."
                    value={filters.search}
                    onChange={e => onSearch(e.target.value)}
                />
                {filters.search && (
                    <button
                        onClick={() => onSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Status */}
            <div className="relative">
                <button
                    onClick={() => toggle('status')}
                    className={cn(
                        'btn-secondary btn-sm h-8 gap-1.5 text-xs',
                        filters.statuses.length > 0 && 'border-brand-500/50 text-brand-300'
                    )}
                >
                    Status {badge(filters.statuses.length)}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
                {open === 'status' && (
                    <Dropdown onClose={() => setOpen(null)}>
                        {STATUSES.map(s => (
                            <DropdownItem
                                key={s}
                                checked={filters.statuses.includes(s)}
                                onClick={() => onToggleStatus(s)}
                            >
                                <span className={cn('text-xs font-medium', STATUS_COLORS[s])}>
                                    {STATUS_LABELS[s]}
                                </span>
                            </DropdownItem>
                        ))}
                    </Dropdown>
                )}
            </div>

            {/* Priority */}
            <div className="relative">
                <button
                    onClick={() => toggle('priority')}
                    className={cn(
                        'btn-secondary btn-sm h-8 gap-1.5 text-xs',
                        filters.priorities.length > 0 && 'border-brand-500/50 text-brand-300'
                    )}
                >
                    Priority {badge(filters.priorities.length)}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
                {open === 'priority' && (
                    <Dropdown onClose={() => setOpen(null)}>
                        {PRIORITIES.map(p => (
                            <DropdownItem
                                key={p.value}
                                checked={filters.priorities.includes(p.value)}
                                onClick={() => onTogglePriority(p.value)}
                            >
                                <span className={cn('text-xs', p.color)}>{p.label}</span>
                            </DropdownItem>
                        ))}
                    </Dropdown>
                )}
            </div>

            {/* Assignee */}
            {members.length > 0 && (
                <div className="relative">
                    <button
                        onClick={() => toggle('assignee')}
                        className={cn(
                            'btn-secondary btn-sm h-8 gap-1.5 text-xs',
                            filters.assigneeIds.length > 0 && 'border-brand-500/50 text-brand-300'
                        )}
                    >
                        Assignee {badge(filters.assigneeIds.length)}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                    {open === 'assignee' && (
                        <Dropdown onClose={() => setOpen(null)}>
                            {members.map(m => (
                                <DropdownItem
                                    key={m.id}
                                    checked={filters.assigneeIds.includes(m.id)}
                                    onClick={() => onToggleAssignee(m.id)}
                                >
                                    <AssigneeAvatar user={m} size="sm" />
                                    <span className="text-xs text-gray-300">{m.full_name ?? m.email}</span>
                                </DropdownItem>
                            ))}
                        </Dropdown>
                    )}
                </div>
            )}

            {/* Label */}
            {labels.length > 0 && (
                <div className="relative">
                    <button
                        onClick={() => toggle('label')}
                        className={cn(
                            'btn-secondary btn-sm h-8 gap-1.5 text-xs',
                            filters.labelIds.length > 0 && 'border-brand-500/50 text-brand-300'
                        )}
                    >
                        Label {badge(filters.labelIds.length)}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                    {open === 'label' && (
                        <Dropdown onClose={() => setOpen(null)}>
                            {labels.map(l => (
                                <DropdownItem
                                    key={l.id}
                                    checked={filters.labelIds.includes(l.id)}
                                    onClick={() => onToggleLabel(l.id)}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                                    <span className="text-xs text-gray-300">{l.name}</span>
                                </DropdownItem>
                            ))}
                        </Dropdown>
                    )}
                </div>
            )}

            {/* Due soon */}
            <button
                onClick={onToggleDueSoon}
                className={cn(
                    'btn-secondary btn-sm h-8 gap-1.5 text-xs',
                    filters.dueSoon && 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'
                )}
            >
                <Clock className="w-3.5 h-3.5" />
                Due soon
            </button>

            {/* Overdue */}
            <button
                onClick={onToggleOverdue}
                className={cn(
                    'btn-secondary btn-sm h-8 gap-1.5 text-xs',
                    filters.overdue && 'border-red-500/50 text-red-400 bg-red-500/10'
                )}
            >
                <AlertCircle className="w-3.5 h-3.5" />
                Overdue
            </button>

            {/* Clear */}
            {hasActiveFilters && (
                <button onClick={onReset} className="btn-ghost btn-sm h-8 gap-1.5 text-xs text-gray-500">
                    <X className="w-3.5 h-3.5" />
                    Clear
                </button>
            )}
        </div>
    )
}

// ── Reusable dropdown + item ──────────────────────────────────

function Dropdown({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <>
            <div className="fixed inset-0 z-10" onClick={onClose} />
            <div className="absolute left-0 top-full mt-1 z-20 w-48 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1 max-h-60 overflow-y-auto">
                {children}
            </div>
        </>
    )
}

function DropdownItem({
    checked, onClick, children,
}: {
    checked: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-gray-800/60 text-left',
                checked && 'bg-gray-800/40'
            )}
        >
            {/* Checkbox */}
            <span className={cn(
                'w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                checked ? 'bg-brand-600 border-brand-600' : 'border-gray-700'
            )}>
                {checked && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </span>
            {children}
        </button>
    )
}