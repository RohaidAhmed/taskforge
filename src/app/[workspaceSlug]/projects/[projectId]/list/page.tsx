// app/[workspaceSlug]/projects/[projectId]/list/page.tsx  (REPLACES Sprint 2)
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceBySlug, getWorkspaceMember, getWorkspaceMembers } from '@/lib/db/workspaces'
import { getProjectById } from '@/lib/db/projects'
import { getLabelsForWorkspace } from '@/lib/db/tasks'
import { getTasksForList } from '@/lib/db/list'
import TaskTable from '@/components/task/TaskTable'
import { LayoutGrid, List } from 'lucide-react'
import type { TaskStatus, TaskPriority } from '@/types/database'
import type { SortField, SortDirection } from '@/lib/db/list'

export const metadata: Metadata = { title: 'List' }

interface Props {
    params: Promise<{ workspaceSlug: string; projectId: string }>
    searchParams: Promise<{
        statuses?: string; priorities?: string; assignees?: string
        labels?: string; q?: string; dueSoon?: string; overdue?: string
        sort?: string; dir?: string
    }>
}

export default async function ListPage({ params, searchParams }: Props) {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/signin');

    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const workspace = await getWorkspaceBySlug(resolvedParams.workspaceSlug)
    if (!workspace) notFound()

    const membership = await getWorkspaceMember(workspace.id, user.id)
    if (!membership) redirect('/')

    const project = await getProjectById(resolvedParams.projectId)
    if (!project || project.workspace_id !== workspace.id) notFound()

    // Parse search params for server-side filtering
    const parse = (v?: string) => v ? v.split(',').filter(Boolean) : []

    const filters = {
        statuses: parse(resolvedSearchParams.statuses) as TaskStatus[],
        priorities: parse(resolvedSearchParams.priorities) as TaskPriority[],
        assigneeIds: parse(resolvedSearchParams.assignees),
        labelIds: parse(resolvedSearchParams.labels),
        search: resolvedSearchParams.q ?? '',
        dueSoon: resolvedSearchParams.dueSoon === '1',
        overdue: resolvedSearchParams.overdue === '1',
    }

    const sort = {
        field: (resolvedSearchParams.sort ?? 'created_at') as SortField,
        direction: (resolvedSearchParams.dir ?? 'desc') as SortDirection,
    }

    const [tasks, membersWithProfile, labels] = await Promise.all([
        getTasksForList(project.id, filters, sort),
        getWorkspaceMembers(workspace.id),
        getLabelsForWorkspace(workspace.id),
    ])

    const members = membersWithProfile.map(m => m.profile)
    const base = `/${workspace.slug}/projects/${project.id}`

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-800/60 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Link href={`/${workspace.slug}/projects`} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                        Projects
                    </Link>
                    <span className="text-gray-700">/</span>
                    <span className="text-sm font-medium text-gray-200">{project.name}</span>
                    <span className="text-xs font-mono text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{project.identifier}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Link href={`${base}/board`} className="btn-ghost btn-sm px-2.5 gap-1.5 text-gray-500">
                        <LayoutGrid className="w-3.5 h-3.5" /> Board
                    </Link>
                    <Link href={`${base}/list`} className="btn-ghost btn-sm px-2.5 gap-1.5 bg-gray-800 text-gray-200">
                        <List className="w-3.5 h-3.5" /> List
                    </Link>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <TaskTable
                    project={project}
                    initialTasks={tasks}
                    members={members}
                    labels={labels}
                    currentUser={user}
                />
            </div>
        </div>
    )
}