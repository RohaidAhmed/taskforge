'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SignUpForm() {
    const router = useRouter()
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const supabase = createClient()

    async function handleSignUp(e: React.FormEvent) {
        e.preventDefault()
        if (password.length < 8) {
            toast.error('Password must be at least 8 characters.')
            return
        }
        setLoading(true)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        setLoading(false)
        if (error) {
            toast.error(error.message)
            return
        }
        setDone(true)
    }

    async function handleGoogleSignUp() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) {
            toast.error(error.message)
            setLoading(false)
        }
    }

    if (done) {
        return (
            <div className="text-center space-y-3 py-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-400">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-gray-200">Check your email</p>
                <p className="text-sm text-gray-500">We sent a confirmation link to <span className="text-gray-300">{email}</span></p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <button onClick={handleGoogleSignUp} disabled={loading} className="btn-secondary btn-lg w-full">
                <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z" />
                </svg>
                Continue with Google
            </button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
                <div className="relative flex justify-center text-xs text-gray-600"><span className="bg-gray-900 px-2">or</span></div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="label" htmlFor="fullName">Full name</label>
                    <input id="fullName" type="text" className="input" placeholder="Ada Lovelace"
                        value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                    <label className="label" htmlFor="email">Email</label>
                    <input id="email" type="email" className="input" placeholder="you@example.com"
                        value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                    <label className="label" htmlFor="password">Password</label>
                    <input id="password" type="password" className="input" placeholder="Min. 8 characters"
                        value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create account
                </button>
            </form>
        </div>
    )
}
