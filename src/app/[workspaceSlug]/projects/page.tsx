// app/[workspaceSlug]/projects/page.tsx
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/lib/db/workspaces'
import { getProjectsByWorkspace } from '@/lib/db/projects'
import CreateProjectButton from './_components/CreateProjectButton'
import { LayoutGrid, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Projects' }

interface Props { params: Promise<{ workspaceSlug: string }> }

export default async function ProjectsPage({ params }: Props) {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/signin');
    
    const { workspaceSlug } = await params;
    if (!workspaceSlug || workspaceSlug.trim() === "") notFound();

    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) notFound();

    const membership = await getWorkspaceMember(workspace.id, user.id);
    if (!membership) redirect('/');

    const projects = await getProjectsByWorkspace(workspace.id);

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-semibold text-gray-100">Projects</h1>
                    <p className="mt-1 text-sm text-gray-500">{workspace.name}</p>
                </div>
                {membership.role !== 'viewer' && (
                    <CreateProjectButton
                        workspaceId={workspace.id}
                        workspaceSlug={workspace.slug}
                        userId={user.id}
                    />
                )}
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <LayoutGrid className="w-5 h-5 text-gray-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-400 mb-1">No projects yet</p>
                    <p className="text-sm text-gray-600">Create a project to start tracking tasks.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {projects.map(project => (
                        <Link
                            key={project.id}
                            href={`/${workspace.slug}/projects/${project.id}/board`}
                            className="flex items-center gap-4 card px-5 py-4 hover:border-gray-700 transition-colors group"
                        >
                            {/* Identifier pill */}
                            <div className="w-9 h-9 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-brand-400">{project.identifier}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate">{project.name}</p>
                                {project.description && (
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{project.description}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${project.status === 'active' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                                    project.status === 'paused' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                                        project.status === 'completed' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                                            'text-gray-500 border-gray-700 bg-gray-800'
                                    }`}>
                                    {project.status}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}