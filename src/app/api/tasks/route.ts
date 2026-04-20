// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspaceMember } from '@/lib/db/workspaces'
import { createTask, getTasksForBoard } from '@/lib/db/tasks'
import type { TaskStatus, TaskPriority } from '@/types/database'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    const tasks = await getTasksForBoard(projectId)
    return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { project_id, workspace_id, title, status, priority, assignee_id, due_date, parent_id } = body

    if (!project_id || !workspace_id || !title) {
        return NextResponse.json({ error: 'project_id, workspace_id, and title are required.' }, { status: 400 })
    }

    const membership = await getWorkspaceMember(workspace_id, user.id)
    if (!membership || membership.role === 'viewer') {
        return NextResponse.json({ error: 'Viewers cannot create tasks.' }, { status: 403 })
    }

    const { data, error } = await createTask({
        project_id,
        workspace_id,
        title: title.trim(),
        status: (status as TaskStatus) ?? 'todo',
        priority: (priority as TaskPriority) ?? 'no_priority',
        created_by: user.id,
        assignee_id: assignee_id ?? null,
        due_date: due_date ?? null,
        parent_id: parent_id ?? null,
    })

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
}