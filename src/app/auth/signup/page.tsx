// app/auth/signup/page.tsx
import { Metadata } from 'next'
import SignUpForm from './SignUpForm'

export const metadata: Metadata = { title: 'Create account' }

export default function SignUpPage() {
  return (
    <div className="card p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Get started with Taskflow for free</p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <a href="/auth/signin" className="text-brand-400 hover:text-brand-300 transition-colors">
          Sign in
        </a>
      </p>
    </div>
  )
}
