'use client'

// hooks/useListFilters.ts
// Syncs filter + sort state with URL search params so filters
// survive page refresh and can be bookmarked / shared.

import { useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { TaskStatus, TaskPriority } from '@/types/database'
import type { SortField, SortDirection, ListFilters } from '@/lib/db/list'

export interface FilterState {
    statuses: TaskStatus[]
    priorities: TaskPriority[]
    assigneeIds: string[]
    labelIds: string[]
    search: string
    dueSoon: boolean
    overdue: boolean
    sortField: SortField
    sortDir: SortDirection
}

function parseArray<T>(value: string | null): T[] {
    if (!value) return []
    return value.split(',').filter(Boolean) as T[]
}

export function useListFilters(): {
    filters: FilterState
    setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
    toggleArrayFilter: <T extends string>(key: 'statuses' | 'priorities' | 'assigneeIds' | 'labelIds', value: T) => void
    resetFilters: () => void
    hasActiveFilters: boolean
} {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const filters: FilterState = useMemo(() => ({
        statuses: parseArray<TaskStatus>(searchParams.get('statuses')),
        priorities: parseArray<TaskPriority>(searchParams.get('priorities')),
        assigneeIds: parseArray<string>(searchParams.get('assignees')),
        labelIds: parseArray<string>(searchParams.get('labels')),
        search: searchParams.get('q') ?? '',
        dueSoon: searchParams.get('dueSoon') === '1',
        overdue: searchParams.get('overdue') === '1',
        sortField: (searchParams.get('sort') as SortField) ?? 'created_at',
        sortDir: (searchParams.get('dir') as SortDirection) ?? 'desc',
    }), [searchParams])

    const push = useCallback((params: URLSearchParams) => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }, [router, pathname])

    const setFilter = useCallback(<K extends keyof FilterState>(
        key: K,
        value: FilterState[K]
    ) => {
        const params = new URLSearchParams(searchParams.toString())

        const keyMap: Partial<Record<keyof FilterState, string>> = {
            statuses: 'statuses', priorities: 'priorities',
            assigneeIds: 'assignees', labelIds: 'labels',
            search: 'q', dueSoon: 'dueSoon', overdue: 'overdue',
            sortField: 'sort', sortDir: 'dir',
        }
        const paramKey = keyMap[key] ?? key

        if (Array.isArray(value)) {
            if (value.length) params.set(paramKey, (value as string[]).join(','))
            else params.delete(paramKey)
        } else if (typeof value === 'boolean') {
            if (value) params.set(paramKey, '1')
            else params.delete(paramKey)
        } else if (value) {
            params.set(paramKey, value as string)
        } else {
            params.delete(paramKey)
        }

        push(params)
    }, [searchParams, push])

    const toggleArrayFilter = useCallback(<T extends string>(
        key: 'statuses' | 'priorities' | 'assigneeIds' | 'labelIds',
        value: T
    ) => {
        const current = filters[key] as T[]
        const next = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value]
        setFilter(key, next as FilterState[typeof key])
    }, [filters, setFilter])

    const resetFilters = useCallback(() => {
        router.push(pathname, { scroll: false })
    }, [router, pathname])

    const hasActiveFilters =
        filters.statuses.length > 0 ||
        filters.priorities.length > 0 ||
        filters.assigneeIds.length > 0 ||
        filters.labelIds.length > 0 ||
        filters.search !== '' ||
        filters.dueSoon ||
        filters.overdue

    return { filters, setFilter, toggleArrayFilter, resetFilters, hasActiveFilters }
}