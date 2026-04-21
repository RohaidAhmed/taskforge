// app/api/comments/[commentId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { updateComment, deleteComment } from '@/lib/db/comments'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ commentId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;

    const { body } = await req.json()
    if (!body?.trim()) return NextResponse.json({ error: 'Body required.' }, { status: 400 })

    // Verify ownership
    const supabase = await createClient()
    const { data: comment } = await supabase
        .from('comments')
        .select('author_id')
        .eq('id', resolvedParams.commentId)
        .single()

    if (!comment || comment.author_id !== user.id) {
        return NextResponse.json({ error: 'Cannot edit this comment.' }, { status: 403 })
    }

    const { error } = await updateComment(resolvedParams.commentId, body.trim())
    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;

    const supabase = await createClient()
    const { data: comment } = await supabase
        .from('comments')
        .select('author_id, task_id, workspace_id')
        .eq('id', resolvedParams.commentId)
        .single()

    if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 })
    if (comment.author_id !== user.id) {
        return NextResponse.json({ error: 'Cannot delete this comment.' }, { status: 403 })
    }

    const { error } = await deleteComment(
        resolvedParams.commentId,
        comment.task_id,
        comment.workspace_id,
        user.id
    )
    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json({ success: true })
}