// app/api/tasks/[taskId]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { getTaskById } from '@/lib/db/tasks'
import { getCommentsForTask, createComment } from '@/lib/db/comments'

interface Params { params: Promise<{ taskId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;

    const comments = await getCommentsForTask(resolvedParams.taskId)
    return NextResponse.json(comments)
}

export async function POST(req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;

    const task = await getTaskById(resolvedParams.taskId)
    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

    const { body } = await req.json()
    if (!body?.trim()) return NextResponse.json({ error: 'Comment body required.' }, { status: 400 })

    const { data, error } = await createComment({
        task_id: resolvedParams.taskId,
        workspace_id: task.workspace_id,
        author_id: user.id,
        body: body.trim(),
    })

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
}