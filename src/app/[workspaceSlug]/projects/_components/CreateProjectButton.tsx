'use client'

// app/[workspaceSlug]/projects/_components/CreateProjectButton.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, X } from 'lucide-react'

interface Props {
    workspaceId: string
    workspaceSlug: string
    userId: string
}

export default function CreateProjectButton({ workspaceId, workspaceSlug, userId }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [identifier, setIdentifier] = useState('')
    const [description, setDescription] = useState('')
    const [identifierEdited, setIdentifierEdited] = useState(false)
    const [loading, setLoading] = useState(false)

    // Auto-generate identifier from name (up to 4 uppercase letters)
    useEffect(() => {
        if (!identifierEdited && name) {
            const generated = name
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase()
                .slice(0, 4)
            setIdentifier(generated)
        }
    }, [name, identifierEdited])

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open])

    function resetForm() {
        setName('')
        setIdentifier('')
        setDescription('')
        setIdentifierEdited(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, name, identifier, description }),
        })

        const json = await res.json()
        setLoading(false)

        if (!res.ok) {
            toast.error(json.error ?? 'Failed to create project')
            return
        }

        toast.success(`Project "${name}" created`)
        setOpen(false)
        resetForm()
        router.push(`/${workspaceSlug}/projects/${json.id}/board`)
        router.refresh()
    }

    return (
        <>
            <button onClick={() => setOpen(true)} className="btn-primary btn-md gap-2">
                <Plus className="w-4 h-4" />
                New project
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) { setOpen(false); resetForm() } }}
                >
                    <div className="w-full max-w-md card p-6 shadow-2xl animate-fade-in">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-sm font-semibold text-gray-200">New project</h2>
                            <button onClick={() => { setOpen(false); resetForm() }} className="btn-ghost btn-sm p-1.5 rounded-md">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="label">Project name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Mobile App"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="label">
                                    Identifier
                                    <span className="ml-1.5 text-gray-600 font-normal">Used in task IDs like TF-42</span>
                                </label>
                                <input
                                    type="text"
                                    className="input font-mono uppercase tracking-widest"
                                    placeholder="TF"
                                    value={identifier}
                                    onChange={e => {
                                        setIdentifierEdited(true)
                                        setIdentifier(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                                    }}
                                    required
                                    minLength={1}
                                    maxLength={6}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="label">Description <span className="text-gray-600 font-normal">(optional)</span></label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="What is this project about?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={() => { setOpen(false); resetForm() }} className="btn-secondary btn-md">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading || !name || !identifier} className="btn-primary btn-md">
                                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Create project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}