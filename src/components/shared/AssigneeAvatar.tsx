// components/shared/AssigneeAvatar.tsx
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/format'
import type { UserProfile } from '@/types/database'

interface Props {
    user: UserProfile | null
    size?: 'sm' | 'md'
    className?: string
}

export default function AssigneeAvatar({ user, size = 'sm', className }: Props) {
    const dim = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs'

    if (!user) {
        return (
            <div className={cn(
                'rounded-full border border-dashed border-gray-700 flex items-center justify-center flex-shrink-0',
                dim, className
            )}>
                <span className="text-gray-700">?</span>
            </div>
        )
    }

    if (user.avatar_url) {
        return (
            <img
                src={user.avatar_url}
                alt={user.full_name ?? user.email}
                title={user.full_name ?? user.email}
                className={cn('rounded-full object-cover flex-shrink-0', dim, className)}
            />
        )
    }

    return (
        <div
            title={user.full_name ?? user.email}
            className={cn(
                'rounded-full bg-brand-600/30 flex items-center justify-center flex-shrink-0 font-semibold text-brand-300',
                dim, className
            )}
        >
            {getInitials(user.full_name, user.email)}
        </div>
    )
}