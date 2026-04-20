'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, UserPlus, MoreHorizontal, Shield, Eye, Crown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getInitials, timeAgo } from '@/lib/utils/format'
import type { Workspace, WorkspaceMemberWithProfile, WorkspaceRole } from '@/types/database'

interface Props {
    workspace: Workspace
    members: WorkspaceMemberWithProfile[]
    currentUserId: string
    currentUserRole: WorkspaceRole
}

const ROLE_META: Record<WorkspaceRole, { label: string; icon: React.ElementType; description: string }> = {
    owner: { label: 'Owner', icon: Crown, description: 'Full access, can delete workspace' },
    member: { label: 'Member', icon: Shield, description: 'Can create and edit tasks' },
    viewer: { label: 'Viewer', icon: Eye, description: 'Read-only access' },
}

export default function MembersClient({ workspace, members, currentUserId, currentUserRole }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member')
    const [inviting, setInviting] = useState(false)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    const canManage = currentUserRole === 'owner'

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault()
        setInviting(true)

        const res = await fetch(`/api/workspaces/${workspace.id}/members/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        })
        const json = await res.json()
        setInviting(false)

        if (!res.ok) {
            toast.error(json.error ?? 'Failed to send invite')
            return
        }

        toast.success(`Invite sent to ${inviteEmail}`)
        setInviteEmail('')
        startTransition(() => router.refresh())
    }

    async function handleRoleChange(userId: string, role: WorkspaceRole) {
        const res = await fetch(`/api/workspaces/${workspace.id}/members/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        })
        const json = await res.json()

        if (!res.ok) {
            toast.error(json.error ?? 'Failed to update role')
            return
        }
        toast.success('Role updated')
        setOpenMenuId(null)
        startTransition(() => router.refresh())
    }

    async function handleRemove(userId: string) {
        const res = await fetch(`/api/workspaces/${workspace.id}/members/${userId}`, {
            method: 'DELETE',
        })
        if (!res.ok) {
            const json = await res.json()
            toast.error(json.error ?? 'Failed to remove member')
            return
        }
        toast.success('Member removed')
        setOpenMenuId(null)
        startTransition(() => router.refresh())
    }

    return (
        <div className="space-y-6">
            {/* Invite form */}
            {canManage && (
                <div className="card p-5">
                    <h2 className="text-sm font-medium text-gray-200 mb-4">Invite member</h2>
                    <form onSubmit={handleInvite} className="flex gap-3">
                        <input
                            type="email"
                            className="input flex-1"
                            placeholder="colleague@company.com"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            required
                        />
                        <select
                            className="input w-32"
                            value={inviteRole}
                            onChange={e => setInviteRole(e.target.value as WorkspaceRole)}
                        >
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                        </select>
                        <button type="submit" disabled={inviting} className="btn-primary btn-md px-4 gap-2 whitespace-nowrap">
                            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Invite
                        </button>
                    </form>
                </div>
            )}

            {/* Members list */}
            <div className="card divide-y divide-gray-800/60">
                <div className="px-5 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-200">
                        {members.length} {members.length === 1 ? 'member' : 'members'}
                    </h2>
                </div>

                {members.map(member => {
                    const { icon: RoleIcon, label: roleLabel } = ROLE_META[member.role]
                    const isCurrentUser = member.user_id === currentUserId
                    const isOwner = member.role === 'owner'
                    const canEdit = canManage && !isOwner && !isCurrentUser
                    const initials = getInitials(member.profile.full_name, member.profile.email)

                    return (
                        <div key={member.user_id} className="flex items-center gap-4 px-5 py-3.5">
                            {/* Avatar */}
                            {member.profile.avatar_url ? (
                                <img src={member.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-semibold text-gray-300">{initials}</span>
                                </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-200 truncate">
                                        {member.profile.full_name ?? member.profile.email}
                                        {isCurrentUser && <span className="ml-1.5 text-xs text-gray-600">(you)</span>}
                                    </p>
                                </div>
                                {member.profile.full_name && (
                                    <p className="text-xs text-gray-500 truncate">{member.profile.email}</p>
                                )}
                            </div>

                            {/* Role badge */}
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <RoleIcon className="w-3.5 h-3.5" />
                                <span>{roleLabel}</span>
                            </div>

                            {/* Joined */}
                            <p className="text-xs text-gray-600 w-20 text-right hidden sm:block">
                                {timeAgo(member.joined_at)}
                            </p>

                            {/* Actions menu */}
                            {canEdit && (
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === member.user_id ? null : member.user_id)}
                                        className="btn-ghost btn-sm p-1.5 rounded-md"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>

                                    {openMenuId === member.user_id && (
                                        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                                            <p className="px-3 py-1.5 text-[11px] font-medium text-gray-600 uppercase tracking-wider">Change role</p>
                                            {(['member', 'viewer'] as WorkspaceRole[]).map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => handleRoleChange(member.user_id, role)}
                                                    className={cn(
                                                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                                                        member.role === role
                                                            ? 'text-brand-400 bg-brand-600/10'
                                                            : 'text-gray-300 hover:bg-gray-800/60'
                                                    )}
                                                >
                                                    {(() => { const I = ROLE_META[role].icon; return <I className="w-4 h-4" /> })()}
                                                    {ROLE_META[role].label}
                                                </button>
                                            ))}
                                            <div className="border-t border-gray-800 mt-1 pt-1">
                                                <button
                                                    onClick={() => handleRemove(member.user_id)}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Remove member
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
