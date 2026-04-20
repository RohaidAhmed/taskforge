// app/[workspaceSlug]/layout.tsx
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceBySlug, getWorkspaceMember, getWorkspacesForUser } from '@/lib/db/workspaces'
import Sidebar from './_components/Sidebar'

interface Props {
    children: React.ReactNode
    params: Promise<{ workspaceSlug: string }>
}

export default async function WorkspaceLayout({ children, params }: Props) {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/signin')

     const resolvedParams = await params // ✅ unwrap params

    const workspace = await getWorkspaceBySlug(resolvedParams.workspaceSlug)
    if (!workspace) notFound()

    // Verify membership
    const membership = await getWorkspaceMember(workspace.id, user.id)
    if (!membership) {
        // User exists but is not a member of this workspace
        const workspaces = await getWorkspacesForUser(user.id)
        if (workspaces.length > 0) redirect(`/${workspaces[0].slug}/projects`)
        redirect('/onboarding')
    }

    const allWorkspaces = await getWorkspacesForUser(user.id)

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                workspace={workspace}
                allWorkspaces={allWorkspaces}
                currentUser={user}
                memberRole={membership.role}
            />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
