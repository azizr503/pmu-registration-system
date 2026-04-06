'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  const resolvedTheme = mounted ? (theme === 'system' ? systemTheme : theme) : 'light'
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

