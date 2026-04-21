// app/api/tasks/[taskId]/labels/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { getTaskById } from '@/lib/db/tasks'
import { addLabelToTask, removeLabelFromTask } from '@/lib/db/tasks'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ taskId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;

    const { label_id } = await req.json()
    if (!label_id) return NextResponse.json({ error: 'label_id required.' }, { status: 400 })

    const task = await getTaskById(resolvedParams.taskId)
    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

    // Log activity
    const supabase = await createClient()
    const { data: label } = await supabase.from('labels').select('name').eq('id', label_id).single()

    const { error } = await addLabelToTask(resolvedParams.taskId, label_id)
    if (error) return NextResponse.json({ error }, { status: 400 })

    await supabase.from('activity_log').insert({
        task_id: resolvedParams.taskId,
        workspace_id: task.workspace_id,
        user_id: user.id,
        type: 'task_label_added',
        meta: { label_id, label_name: label?.name ?? '' },
    })

    return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;

    const { label_id } = await req.json()
    if (!label_id) return NextResponse.json({ error: 'label_id required.' }, { status: 400 })

    const task = await getTaskById(resolvedParams.taskId)
    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

    const supabase = await createClient()
    const { data: label } = await supabase.from('labels').select('name').eq('id', label_id).single()

    const { error } = await removeLabelFromTask(resolvedParams.taskId, label_id)
    if (error) return NextResponse.json({ error }, { status: 400 })

    await supabase.from('activity_log').insert({
        task_id: resolvedParams.taskId,
        workspace_id: task.workspace_id,
        user_id: user.id,
        type: 'task_label_removed',
        meta: { label_id, label_name: label?.name ?? '' },
    })

    return NextResponse.json({ success: true })
}