'use client'

// components/task/CommentThread.tsx
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react'
import AssigneeAvatar from '@/components/shared/AssigneeAvatar'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { CommentWithAuthor, UserProfile } from '@/types/database'

interface Props {
    taskId: string
    initialComments: CommentWithAuthor[]
    currentUser: UserProfile
}

export default function CommentThread({ taskId, initialComments, currentUser }: Props) {
    const [comments, setComments] = useState(initialComments)
    const [body, setBody] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editBody, setEditBody] = useState('')
    const [menuId, setMenuId] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    function autoResize(el: HTMLTextAreaElement) {
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!body.trim()) return
        setSubmitting(true)

        const res = await fetch(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body }),
        })
        const json = await res.json()
        setSubmitting(false)

        if (!res.ok) { toast.error(json.error ?? 'Failed to post comment'); return }
        setComments(prev => [...prev, json])
        setBody('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }

    async function handleEdit(commentId: string) {
        if (!editBody.trim()) return
        const res = await fetch(`/api/comments/${commentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: editBody }),
        })
        if (!res.ok) { toast.error('Failed to update comment'); return }

        setComments(prev => prev.map(c =>
            c.id === commentId ? { ...c, body: editBody, edited_at: new Date().toISOString() } : c
        ))
        setEditingId(null)
    }

    async function handleDelete(commentId: string) {
        const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
        if (!res.ok) { toast.error('Failed to delete comment'); return }
        setComments(prev => prev.filter(c => c.id !== commentId))
        setMenuId(null)
        toast.success('Comment deleted')
    }

    return (
        <div className="space-y-4">
            {/* Comment list */}
            {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 group">
                    <AssigneeAvatar user={comment.author} size="sm" className="flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-300">
                                {comment.author.full_name ?? comment.author.email}
                            </span>
                            <span className="text-[10px] text-gray-600">{timeAgo(comment.created_at)}</span>
                            {comment.edited_at && (
                                <span className="text-[10px] text-gray-700 italic">(edited)</span>
                            )}
                        </div>

                        {editingId === comment.id ? (
                            <div className="space-y-2">
                                <textarea
                                    className="input text-sm resize-none w-full"
                                    value={editBody}
                                    onChange={e => { setEditBody(e.target.value); autoResize(e.target) }}
                                    rows={2}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(comment.id)}
                                        className="btn-primary btn-sm gap-1.5">
                                        <Check className="w-3 h-3" /> Save
                                    </button>
                                    <button onClick={() => setEditingId(null)}
                                        className="btn-secondary btn-sm gap-1.5">
                                        <X className="w-3 h-3" /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {comment.body}
                            </p>
                        )}
                    </div>

                    {/* Actions — only author sees these */}
                    {comment.author_id === currentUser.id && editingId !== comment.id && (
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                                onClick={() => setMenuId(menuId === comment.id ? null : comment.id)}
                                className="btn-ghost btn-sm p-1 rounded"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {menuId === comment.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                                    <button
                                        onClick={() => { setEditingId(comment.id); setEditBody(comment.body); setMenuId(null) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800/60"
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* New comment */}
            <form onSubmit={handleSubmit} className="flex gap-3">
                <AssigneeAvatar user={currentUser} size="sm" className="flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-2">
                    <textarea
                        ref={textareaRef}
                        className="input text-sm resize-none w-full min-h-[36px]"
                        placeholder="Leave a comment..."
                        value={body}
                        onChange={e => { setBody(e.target.value); autoResize(e.target) }}
                        rows={1}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
                        }}
                    />
                    {body.trim() && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-600">⌘ Enter to submit</span>
                            <button type="submit" disabled={submitting} className="btn-primary btn-sm gap-1.5">
                                {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                                Comment
                            </button>
                        </div>
                    )}
                </div>
            </form>
        </div>
    )
}