// app/[workspaceSlug]/projects/[projectId]/list/page.tsx
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/lib/db/workspaces'
import { getProjectById } from '@/lib/db/projects'
import { getTasksForBoard } from '@/lib/db/tasks'
import { LayoutGrid, List } from 'lucide-react'
import PriorityBadge from '@/components/shared/PriorityBadge'
import AssigneeAvatar from '@/components/shared/AssigneeAvatar'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/store/boardStore'
import { formatTaskId, formatDueDate, isOverdue } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export const metadata: Metadata = { title: 'List' }

interface Props {
    params: Promise<{ workspaceSlug: string; projectId: string }>
}

export default async function ListPage({ params }: Props) {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/signin')
    
    const resolvedParams = await params;

    const workspace = await getWorkspaceBySlug(resolvedParams.workspaceSlug)
    if (!workspace) notFound()

    const membership = await getWorkspaceMember(workspace.id, user.id)
    if (!membership) redirect('/')

    const project = await getProjectById(resolvedParams.projectId)
    if (!project || project.workspace_id !== workspace.id) notFound()

    const tasks = await getTasksForBoard(project.id)
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
                        <LayoutGrid className="w-3.5 h-3.5" />Board
                    </Link>
                    <Link href={`${base}/list`} className="btn-ghost btn-sm px-2.5 gap-1.5 bg-gray-800 text-gray-200">
                        <List className="w-3.5 h-3.5" />List
                    </Link>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 w-16">ID</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Title</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 w-28">Status</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 w-24">Priority</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 w-24">Due date</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 w-20">Assignee</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-gray-800/30 transition-colors cursor-pointer group">
                                <td className="py-2.5 px-3">
                                    <span className="text-xs font-mono text-gray-600">
                                        {formatTaskId(project.identifier, task.sequence_number)}
                                    </span>
                                </td>
                                <td className="py-2.5 px-3">
                                    <span className="text-gray-200 group-hover:text-white transition-colors">{task.title}</span>
                                </td>
                                <td className="py-2.5 px-3">
                                    <span className={cn('text-xs font-medium', STATUS_COLORS[task.status])}>
                                        {STATUS_LABELS[task.status]}
                                    </span>
                                </td>
                                <td className="py-2.5 px-3">
                                    <PriorityBadge priority={task.priority} showLabel />
                                </td>
                                <td className="py-2.5 px-3">
                                    {task.due_date ? (
                                        <span className={cn('text-xs', isOverdue(task.due_date) ? 'text-red-400' : 'text-gray-500')}>
                                            {formatDueDate(task.due_date)}
                                        </span>
                                    ) : (
                                        <span className="text-gray-700 text-xs">—</span>
                                    )}
                                </td>
                                <td className="py-2.5 px-3">
                                    <AssigneeAvatar user={task.assignee} size="sm" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {tasks.length === 0 && (
                    <div className="text-center py-16 text-gray-600 text-sm">No tasks yet</div>
                )}
            </div>
        </div>
    )
}