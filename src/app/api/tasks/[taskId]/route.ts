// app/api/tasks/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { getTaskById, updateTask, deleteTask, reorderTask } from '@/lib/db/tasks'
import type { TaskStatus } from '@/types/database'

interface Params {
    params: Promise<{ taskId: string }>
}


export async function PATCH(req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await params;

    const body = await req.json()
    const task = await getTaskById(taskId)
    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

    // ── Reorder (drag-and-drop) ───────────────────────────────
    if (body._action === 'reorder') {
        const { newStatus, overTaskId, belowTaskId } = body
        const { error } = await reorderTask(
            taskId,
            newStatus as TaskStatus,
            overTaskId ?? null,
            belowTaskId ?? null,
            task.project_id,
            user.id,
            task.workspace_id,
            task.status
        )
        if (error) return NextResponse.json({ error }, { status: 400 })
        return NextResponse.json({ success: true })
    }

    // ── Regular update ────────────────────────────────────────
    const { _action, ...payload } = body
    const { data, error } = await updateTask(
        taskId,
        payload,
        user.id,
        task.workspace_id,
        task
    )

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await params;

    const task = await getTaskById(taskId)
    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

    const { error } = await deleteTask(taskId, user.id, task.workspace_id)
    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json({ success: true })
}