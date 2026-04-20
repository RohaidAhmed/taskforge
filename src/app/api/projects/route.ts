// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceMember } from '@/lib/db/workspaces'
import { createProject } from '@/lib/db/projects'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { workspace_id, name, description, identifier } = body

    if (!workspace_id || !name || !identifier) {
        return NextResponse.json({ error: 'workspace_id, name, and identifier are required.' }, { status: 400 })
    }

    const membership = await getWorkspaceMember(workspace_id, user.id)
    if (!membership || membership.role === 'viewer') {
        return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const { data, error } = await createProject({
        workspace_id,
        name,
        description: description ?? null,
        identifier: identifier.toUpperCase(),
        created_by: user.id,
    })

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
}