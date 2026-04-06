'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

export function TopBar() {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()

  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null
  }

  if (pathname?.startsWith('/student') || pathname?.startsWith('/faculty') || pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <header className="w-full border-b border-border/60 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-3">
        <div className="relative flex items-center justify-center">
          <div className="absolute left-0 flex items-center gap-2">
            {!isLoading && user && (
              <Button asChild variant="outline" size="sm">
                <Link href="/">Home</Link>
              </Button>
            )}
            {!isLoading && !user && pathname !== '/login' && pathname !== '/register' && (
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </div>

          <img
            src="/img/pmulogo.png"
            alt="PMU Official Logo"
            className="h-[60px] max-h-[60px] w-auto max-w-[220px] object-contain object-center"
          />

          <div className="absolute right-0 w-10" aria-hidden />
        </div>
      </div>
    </header>
  )
}
