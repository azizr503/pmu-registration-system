'use client'

import { usePathname } from 'next/navigation'

export function ConditionalFooter() {
  const pathname = usePathname()
  if (pathname === '/') {
    return null
  }
  return (
    <footer className="border-t border-border/60 bg-white dark:bg-white">
      <div className="w-full py-0">
        <img
          src="/img/underpagebuildingpmu.png"
          alt="Under page building"
          className="block h-auto w-full object-contain"
        />
      </div>
    </footer>
  )
}
