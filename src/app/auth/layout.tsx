// app/auth/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className="text-lg font-semibold text-gray-100">Taskflow</span>
                    </div>
                </div>
                {children}
            </div>
        </div>
    )
}
