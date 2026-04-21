'use client'

// components/shared/SortableHeader.tsx
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { SortField, SortDirection } from '@/lib/db/list'

interface Props {
    field: SortField
    label: string
    currentField: SortField
    currentDir: SortDirection
    onSort: (field: SortField) => void
    className?: string
}

export default function SortableHeader({
    field, label, currentField, currentDir, onSort, className,
}: Props) {
    const isActive = currentField === field

    return (
        <button
            onClick={() => onSort(field)}
            className={cn(
                'flex items-center gap-1 text-xs font-medium transition-colors group',
                isActive ? 'text-gray-300' : 'text-gray-600 hover:text-gray-400',
                className
            )}
        >
            {label}
            <span className="opacity-60">
                {isActive
                    ? currentDir === 'asc'
                        ? <ArrowUp className="w-3 h-3" />
                        : <ArrowDown className="w-3 h-3" />
                    : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                }
            </span>
        </button>
    )
}