// app/auth/signin/page.tsx
import { Metadata } from 'next'
import SignInForm from './SignInForm'

export const metadata: Metadata = { title: 'Sign in' }

export default function SignInPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string }
}) {
  return (
    <div className="card p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
      </div>

      {searchParams.error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {searchParams.error === 'unauthorized' ? 'Please sign in to continue.' : searchParams.error}
        </div>
      )}

      <SignInForm redirectTo={searchParams.redirectTo} />

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <a href="/auth/signup" className="text-brand-400 hover:text-brand-300 transition-colors">
          Sign up
        </a>
      </p>
    </div>
  )
}
