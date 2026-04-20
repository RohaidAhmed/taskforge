// app/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspacesForUser } from '@/lib/db/workspaces'
import { Metadata } from 'next'
import OnboardingForm from './OnboardingForm'

export const metadata: Metadata = { title: 'Create your workspace' }

export default async function OnboardingPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/signin')

    const workspaces = await getWorkspacesForUser(user.id)
    if (workspaces.length > 0) redirect(`/${workspaces[0].slug}/projects`)

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className="text-lg font-semibold text-gray-100">Taskflow</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-100">Create your workspace</h1>
                    <p className="mt-2 text-sm text-gray-500">
                        A workspace is where your team&apos;s projects and tasks live.
                    </p>
                </div>
                <div className="card p-8">
                    <OnboardingForm userId={user.id} userName={user.full_name ?? user.email} />
                </div>
            </div>
        </div>
    )
}
