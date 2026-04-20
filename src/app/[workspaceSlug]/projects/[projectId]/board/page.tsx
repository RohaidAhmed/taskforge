// app/[workspaceSlug]/projects/[projectId]/board/page.tsx
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/lib/db/workspaces'
import { getProjectById } from '@/lib/db/projects'
import { getTasksForBoard } from '@/lib/db/tasks'
import TaskBoard from '@/components/board/TaskBoard'
import { LayoutGrid, List, Settings } from 'lucide-react'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ projectId: string }>
}): Promise<Metadata> {
    const resolvedParams = await params;
    const project = await getProjectById(resolvedParams.projectId)
    return { title: project ? `${project.name} · Board` : 'Board' }
}

interface Props {
    params: Promise<{ workspaceSlug: string; projectId: string }>
}

export default async function BoardPage({ params }: Props) {
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
            {/* Board header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-800/60 flex-shrink-0">
                <div className="flex items-center gap-3">
                    {/* Breadcrumb */}
                    <Link
                        href={`/${workspace.slug}/projects`}
                        className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        Projects
                    </Link>
                    <span className="text-gray-700">/</span>
                    <span className="text-sm font-medium text-gray-200">{project.name}</span>

                    {/* Identifier chip */}
                    <span className="text-xs font-mono text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
                        {project.identifier}
                    </span>
                </div>

                {/* View switcher */}
                <div className="flex items-center gap-1">
                    <Link
                        href={`${base}/board`}
                        className="btn-ghost btn-sm px-2.5 gap-1.5 bg-gray-800 text-gray-200"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Board
                    </Link>
                    <Link
                        href={`${base}/list`}
                        className="btn-ghost btn-sm px-2.5 gap-1.5 text-gray-500"
                    >
                        <List className="w-3.5 h-3.5" />
                        List
                    </Link>
                </div>
            </div>

            {/* Board — fills remaining height */}
            <div className="flex-1 overflow-hidden">
                <TaskBoard project={project} initialTasks={tasks} />
            </div>
        </div>
    )
}