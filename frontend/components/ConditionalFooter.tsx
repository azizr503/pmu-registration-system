'use client'

import { usePathname } from 'next/navigation'

export function ConditionalFooter() {
  const pathname = usePathname()
  if (pathname === '/') {
    return null
  }
  return (
    <footer className="border-t border-gray-200 bg-white transition-colors dark:border-[#2a2d3e] dark:bg-[#0f1117]">
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
