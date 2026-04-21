// app/api/tasks/[taskId]/activity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/auth'
import { getActivityForTask } from '@/lib/db/comments'

interface Params { params: Promise<{ taskId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;

    const activity = await getActivityForTask(resolvedParams.taskId)
    return NextResponse.json(activity)
}