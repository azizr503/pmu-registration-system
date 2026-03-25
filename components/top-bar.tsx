'use client'

import Link from 'next/link'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function TopBar() {
  const { user, isLoading } = useAuth()

  return (
    <header className="w-full border-b border-border/60 bg-white dark:bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-3">
        <div className="relative flex items-center justify-center">
          <div className="absolute left-0 flex items-center gap-2">
            {!isLoading && user && (
              <Button asChild variant="outline" size="sm">
                <Link href="/">Dashboard</Link>
              </Button>
            )}
            {!isLoading && !user && (
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </div>

          <img
            src="/pmulogo.png"
            alt="PMU Official Logo"
            className="h-14 w-auto object-contain"
          />

          <div className="absolute right-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

