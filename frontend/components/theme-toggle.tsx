'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0 border-gray-200 bg-white text-gray-900 transition-colors dark:border-[#2a2d3e] dark:bg-[#1e2130] dark:text-white"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <img src="/img/sun.svg" alt="" className="h-4 w-4 dark:invert" width={16} height={16} />
      ) : (
        <img src="/img/moon.svg" alt="" className="h-4 w-4 dark:invert" width={16} height={16} />
      )}
    </Button>
  )
}
