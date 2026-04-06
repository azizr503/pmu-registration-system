import { Suspense } from 'react'
import LoginContent from '@/components/LoginContent'

function LoginFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f0f2f5] text-[#4a5568]">
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
