'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { PmuLogo } from '@/components/pmu-logo'

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
    <header className="w-full border-b border-gray-200 bg-white transition-colors dark:border-[#2a2d3e] dark:bg-[#1a1d27]">
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

          <PmuLogo size="topbar" alt="PMU Official Logo" />

          <div className="absolute right-0 flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
