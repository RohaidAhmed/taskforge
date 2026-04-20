// app/[workspaceSlug]/settings/members/page.tsx
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceBySlug, getWorkspaceMember, getWorkspaceMembers } from '@/lib/db/workspaces'
import MembersClient from './MembersClient'

export const metadata: Metadata = { title: 'Members' }

interface Props {
    params: Promise<{ workspaceSlug: string }>
}

export default async function MembersPage({ params }: Props) {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/signin');

    const resolvedParams = await params

    const workspace = await getWorkspaceBySlug(resolvedParams.workspaceSlug)
    if (!workspace) notFound()

    const membership = await getWorkspaceMember(workspace.id, user.id)
    if (!membership) redirect('/')

    const members = await getWorkspaceMembers(workspace.id)

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h1 className="text-xl font-semibold text-gray-100">Members</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage who has access to <span className="text-gray-300">{workspace.name}</span>
                </p>
            </div>

            <MembersClient
                workspace={workspace}
                members={members}
                currentUserId={user.id}
                currentUserRole={membership.role}
            />
        </div>
    )
}
