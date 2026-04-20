'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toSlug } from '@/lib/utils/format'

interface Props {
    userId: string
    userName: string
}

export default function OnboardingForm({ userId, userName }: Props) {
    const router = useRouter()
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [slugEdited, setSlugEdited] = useState(false)
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
    const [checkingSlug, setCheckingSlug] = useState(false)
    const [loading, setLoading] = useState(false)

    // Auto-generate slug from name
    useEffect(() => {
        if (!slugEdited && name) {
            setSlug(toSlug(name))
        }
    }, [name, slugEdited])

    // Debounce slug availability check
    useEffect(() => {
        if (!slug || slug.length < 2) {
            setSlugAvailable(null)
            return
        }
        setCheckingSlug(true)
        const timer = setTimeout(async () => {
            const res = await fetch(`/api/workspaces/check-slug?slug=${encodeURIComponent(slug)}`)
            const { available } = await res.json()
            setSlugAvailable(available)
            setCheckingSlug(false)
        }, 400)
        return () => clearTimeout(timer)
    }, [slug])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!slugAvailable) return
        setLoading(true)

        const res = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, slug, owner_id: userId }),
        })

        const json = await res.json()
        setLoading(false)

        if (!res.ok) {
            toast.error(json.error ?? 'Failed to create workspace')
            return
        }

        router.push(`/${json.slug}/projects`)
    }

    const slugStatus = () => {
        if (!slug || slug.length < 2) return null
        if (checkingSlug) return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        if (slugAvailable === true) return <CheckCircle2 className="w-4 h-4 text-green-500" />
        if (slugAvailable === false) return <XCircle className="w-4 h-4 text-red-500" />
        return null
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
                <label className="label" htmlFor="name">Workspace name</label>
                <input
                    id="name"
                    type="text"
                    className="input"
                    placeholder="Acme Corp"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                />
            </div>

            <div className="space-y-1.5">
                <label className="label" htmlFor="slug">URL</label>
                <div className="flex items-center gap-0">
                    <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-gray-800 bg-gray-800/50 px-3 text-sm text-gray-500 select-none">
                        taskflow.app/
                    </span>
                    <div className="relative flex-1">
                        <input
                            id="slug"
                            type="text"
                            className="input rounded-l-none pr-8"
                            placeholder="acme-corp"
                            value={slug}
                            onChange={e => {
                                setSlugEdited(true)
                                setSlug(toSlug(e.target.value))
                            }}
                            required
                            minLength={2}
                            maxLength={48}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            {slugStatus()}
                        </div>
                    </div>
                </div>
                {slugAvailable === false && (
                    <p className="text-xs text-red-400">This URL is already taken.</p>
                )}
            </div>

            <button
                type="submit"
                disabled={loading || !slugAvailable || !name}
                className="btn-primary btn-lg w-full mt-2"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create workspace
            </button>
        </form>
    )
}
