// app/api/workspaces/[workspaceId]/members/invite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceMember, addWorkspaceMember } from '@/lib/db/workspaces'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(
    req: NextRequest,
    { params }: { params: { workspaceId: string } }
) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only owners and members can invite
    const membership = await getWorkspaceMember(params.workspaceId, currentUser.id)
    if (!membership || membership.role === 'viewer') {
        return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const { email, role } = await req.json()
    if (!email || !role) {
        return NextResponse.json({ error: 'Email and role are required.' }, { status: 400 })
    }

    // Look up the user by email via admin client
    const admin = createAdminClient()
    const { data: { users }, error: lookupError } = await admin.auth.admin.listUsers({ perPage: 1000 })

    if (lookupError) {
        return NextResponse.json({ error: 'Failed to look up user.' }, { status: 500 })
    }

    const targetUser = users.find(u => u.email === email)
    if (!targetUser) {
        // In a real app: send an email invitation to sign up first.
        // For now, user must have an account already.
        return NextResponse.json(
            { error: 'No account found with that email. Ask them to sign up first.' },
            { status: 404 }
        )
    }

    const { error } = await addWorkspaceMember({
        workspace_id: params.workspaceId,
        user_id: targetUser.id,
        role,
        invited_by: currentUser.id,
    })

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json({ success: true }, { status: 201 })
}
