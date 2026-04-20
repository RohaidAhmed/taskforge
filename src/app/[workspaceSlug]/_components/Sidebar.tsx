'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutGrid, List, Settings, Users, ChevronDown,
    Plus, LogOut, Check, ChevronsUpDown
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/format'
import type { Workspace, WorkspaceRole, UserProfile } from '@/types/database'

interface Props {
    workspace: Workspace
    allWorkspaces: Workspace[]
    currentUser: UserProfile
    memberRole: WorkspaceRole
}

export default function Sidebar({ workspace, allWorkspaces, currentUser, memberRole }: Props) {
    const pathname = usePathname()
    const router = useRouter()
    const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)

    const base = `/${workspace.slug}`

    const navItems = [
        { href: `${base}/projects`, label: 'Projects', icon: LayoutGrid },
        { href: `${base}/my-tasks`, label: 'My tasks', icon: List },
    ]

    const settingsItems = [
        { href: `${base}/settings/members`, label: 'Members', icon: Users },
        ...(memberRole === 'owner'
            ? [{ href: `${base}/settings/workspace`, label: 'Settings', icon: Settings }]
            : []),
    ]

    async function handleSignOut() {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/auth/signin')
        router.refresh()
    }

    const initials = getInitials(currentUser.full_name, currentUser.email)

    return (
        <aside className="w-56 flex-shrink-0 flex flex-col border-r border-gray-800/60 bg-gray-950 h-full">
            {/* Workspace switcher */}
            <div className="relative p-3 border-b border-gray-800/60">
                <button
                    onClick={() => setWsSwitcherOpen(v => !v)}
                    className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-gray-800/60 transition-colors text-left"
                >
                    <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">
                            {workspace.name[0].toUpperCase()}
                        </span>
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-200 truncate">{workspace.name}</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                </button>

                {wsSwitcherOpen && (
                    <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                        {allWorkspaces.map(ws => (
                            <Link
                                key={ws.id}
                                href={`/${ws.slug}/projects`}
                                onClick={() => setWsSwitcherOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800/60 transition-colors"
                            >
                                <div className="w-5 h-5 rounded bg-brand-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[9px] font-bold text-white">{ws.name[0].toUpperCase()}</span>
                                </div>
                                <span className="flex-1 text-sm text-gray-200 truncate">{ws.name}</span>
                                {ws.id === workspace.id && <Check className="w-3.5 h-3.5 text-brand-400" />}
                            </Link>
                        ))}
                        <div className="border-t border-gray-800 mt-1 pt-1">
                            <Link
                                href="/onboarding"
                                onClick={() => setWsSwitcherOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800/60 transition-colors text-gray-500 hover:text-gray-300"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm">New workspace</span>
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {navItems.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                            pathname.startsWith(href)
                                ? 'bg-gray-800 text-gray-100'
                                : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                        )}
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {label}
                    </Link>
                ))}

                <div className="pt-4 pb-1">
                    <p className="px-2.5 text-[11px] font-medium text-gray-600 uppercase tracking-wider">Settings</p>
                </div>

                {settingsItems.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                            pathname.startsWith(href)
                                ? 'bg-gray-800 text-gray-100'
                                : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                        )}
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {label}
                    </Link>
                ))}
            </nav>

            {/* User menu */}
            <div className="relative p-3 border-t border-gray-800/60">
                <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-gray-800/60 transition-colors text-left"
                >
                    {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-semibold text-gray-300">{initials}</span>
                        </div>
                    )}
                    <span className="flex-1 text-sm text-gray-300 truncate">
                        {currentUser.full_name ?? currentUser.email}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                </button>

                {userMenuOpen && (
                    <div className="absolute left-3 right-3 bottom-full mb-1 z-50 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                        <div className="px-3 py-2 border-b border-gray-800">
                            <p className="text-xs font-medium text-gray-200 truncate">
                                {currentUser.full_name ?? 'Account'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </aside>
    )
}
