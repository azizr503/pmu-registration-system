import { Suspense } from 'react'
import LoginContent from '@/components/LoginContent'

function LoginFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f0f2f5] text-[#4a5568] transition-colors duration-300 dark:bg-[#0f1117] dark:text-[#9ca3af]">
      <p className="text-sm">Loading…</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}
