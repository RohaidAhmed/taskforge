// app/api/workspaces/check-slug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isSlugAvailable } from '@/lib/db/workspaces'

export async function GET(req: NextRequest) {
    const slug = req.nextUrl.searchParams.get('slug') ?? ''

    if (!/^[a-z0-9-]{2,48}$/.test(slug)) {
        return NextResponse.json({ available: false })
    }

    const available = await isSlugAvailable(slug)
    return NextResponse.json({ available })
}
