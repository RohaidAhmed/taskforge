// app/api/workspaces/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { createWorkspace } from '@/lib/db/workspaces'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, slug } = body

    if (!name || !slug) {
        return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 })
    }

    const { data, error } = await createWorkspace({ name, slug, owner_id: user.id })

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
}
