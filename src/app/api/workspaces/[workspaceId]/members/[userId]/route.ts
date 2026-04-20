// app/api/workspaces/[workspaceId]/members/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceMember, updateMemberRole, removeWorkspaceMember } from '@/lib/db/workspaces'
import type { WorkspaceRole } from '@/types/database'

interface Params {
    params: { workspaceId: string; userId: string }
}

// PATCH — update role
export async function PATCH(req: NextRequest, { params }: Params) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentMembership = await getWorkspaceMember(params.workspaceId, currentUser.id)
    if (!currentMembership || currentMembership.role !== 'owner') {
        return NextResponse.json({ error: 'Only owners can change roles.' }, { status: 403 })
    }

    const { role } = await req.json() as { role: WorkspaceRole }
    if (!['member', 'viewer'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }

    const { error } = await updateMemberRole(params.workspaceId, params.userId, role)
    if (error) return NextResponse.json({ error }, { status: 400 })

    return NextResponse.json({ success: true })
}

// DELETE — remove member
export async function DELETE(_req: NextRequest, { params }: Params) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentMembership = await getWorkspaceMember(params.workspaceId, currentUser.id)

    // Allow self-removal or owner removing others
    const isSelf = currentUser.id === params.userId
    const isOwner = currentMembership?.role === 'owner'

    if (!isSelf && !isOwner) {
        return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    // Prevent owner from removing themselves
    const targetMembership = await getWorkspaceMember(params.workspaceId, params.userId)
    if (targetMembership?.role === 'owner') {
        return NextResponse.json({ error: 'Cannot remove the workspace owner.' }, { status: 400 })
    }

    const { error } = await removeWorkspaceMember(params.workspaceId, params.userId)
    if (error) return NextResponse.json({ error }, { status: 400 })

    return NextResponse.json({ success: true })
}
