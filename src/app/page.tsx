// app/page.tsx
// Redirects authenticated users to their first workspace.
// Unauthenticated users go to sign-in (handled by middleware).

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db/auth'
import { getWorkspacesForUser } from '@/lib/db/workspaces'

export default async function RootPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const workspaces = await getWorkspacesForUser(user.id)

  if (workspaces.length === 0) {
    redirect('/onboarding')
  }

  // Redirect to the first workspace's board
  redirect(`/${workspaces[0].slug}/projects`)
}
