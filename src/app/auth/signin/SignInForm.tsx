'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SignInForm({ redirectTo }: { redirectTo?: string }) {
    const router = useRouter()
    const [mode, setMode] = useState<'password' | 'magic'>('password')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [magicSent, setMagicSent] = useState(false)

    const supabase = createClient()
    const destination = redirectTo || '/'

    async function handlePasswordSignIn(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            toast.error(error.message)
            setLoading(false)
            return
        }

        router.push(destination)
        router.refresh()
    }

    async function handleMagicLink(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${destination}`,
            },
        })

        setLoading(false)
        if (error) {
            toast.error(error.message)
            return
        }
        setMagicSent(true)
    }

    async function handleGoogleSignIn() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?redirectTo=${destination}`,
            },
        })
        if (error) {
            toast.error(error.message)
            setLoading(false)
        }
    }

    if (magicSent) {
        return (
            <div className="text-center space-y-3 py-4">
                <div className="w-12 h-12 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-brand-400">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-gray-200">Check your email</p>
                <p className="text-sm text-gray-500">We sent a sign-in link to <span className="text-gray-300">{email}</span></p>
                <button onClick={() => setMagicSent(false)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                    Try again
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Google OAuth */}
            <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="btn-secondary btn-lg w-full"
            >
                <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z" />
                </svg>
                Continue with Google
            </button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-600">
                    <span className="bg-gray-900 px-2">or</span>
                </div>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-800 p-1 gap-1">
                {(['password', 'magic'] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${mode === m
                                ? 'bg-gray-800 text-gray-100'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {m === 'password' ? 'Password' : 'Magic link'}
                    </button>
                ))}
            </div>

            <form onSubmit={mode === 'password' ? handlePasswordSignIn : handleMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="label" htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        className="input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>

                {mode === 'password' && (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="label" htmlFor="password">Password</label>
                            <a href="/auth/reset-password" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                                Forgot password?
                            </a>
                        </div>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {mode === 'password' ? 'Sign in' : 'Send magic link'}
                </button>
            </form>
        </div>
    )
}
