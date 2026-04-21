// app/[workspaceSlug]/my-tasks/page.tsx
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceBySlug, getWorkspaceMember, getWorkspaceMembers } from '@/lib/db/workspaces'
import { getLabelsForWorkspace } from '@/lib/db/tasks'
import { getMyTasks } from '@/lib/db/list'
import MyTasksClient from './MyTasksClient'
import type { TaskStatus, TaskPriority } from '@/types/database'
import type { SortField, SortDirection } from '@/lib/db/list'

export const metadata: Metadata = { title: 'My tasks' }

interface Props {
    params: Promise<{ workspaceSlug: string }>
    searchParams: Promise<{
        statuses?: string; priorities?: string; q?: string
        sort?: string; dir?: string
    }>
}

export default async function MyTasksPage({ params, searchParams }: Props) {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/signin');

    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const workspace = await getWorkspaceBySlug(resolvedParams.workspaceSlug)
    if (!workspace) notFound()

    const membership = await getWorkspaceMember(workspace.id, user.id)
    if (!membership) redirect('/')

    const parse = (v?: string) => v ? v.split(',').filter(Boolean) : []

    const filters = {
        statuses: parse(resolvedSearchParams.statuses) as TaskStatus[],
        priorities: parse(resolvedSearchParams.priorities) as TaskPriority[],
        search: resolvedSearchParams.q ?? '',
    }

    const sort = {
        field: (resolvedSearchParams.sort ?? 'due_date') as SortField,
        direction: (resolvedSearchParams.dir ?? 'asc') as SortDirection,
    }

    const [tasks, membersWithProfile, labels] = await Promise.all([
        getMyTasks(user.id, workspace.id, filters, sort),
        getWorkspaceMembers(workspace.id),
        getLabelsForWorkspace(workspace.id),
    ])

    const members = membersWithProfile.map(m => m.profile)

    // Group tasks by status for the grouped view
    const grouped: Record<string, typeof tasks> = {}
    for (const task of tasks) {
        if (!grouped[task.status]) grouped[task.status] = []
        grouped[task.status].push(task)
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-gray-100">My tasks</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Tasks assigned to you in <span className="text-gray-300">{workspace.name}</span>
                </p>
            </div>

            <MyTasksClient
                initialTasks={tasks}
                members={members}
                labels={labels}
                currentUser={user}
                workspaceSlug={workspace.slug}
            />
        </div>
    )
}