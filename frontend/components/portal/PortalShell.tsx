'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { PmuLogo } from '@/components/pmu-logo'

export type PortalNavItem = {
  href: string
  label: string
  badge?: string
  iconSrc?: string
  iconAlt?: string
}

type Props = {
  portalTitle: string
  nav: PortalNavItem[]
  children: React.ReactNode
}

export function PortalShell({ portalTitle, nav, children }: Props) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-1 bg-[#f4f6f9] transition-colors duration-300 dark:bg-[#0f1117]">
      <aside className="hidden w-[220px] shrink-0 border-r border-gray-200 bg-white transition-colors dark:border-[#2a2d3e] dark:bg-[#1a1d27] md:block">
        <div className="flex min-h-[72px] items-center border-b border-gray-200 px-4 py-2 dark:border-[#2a2d3e]">
          <PmuLogo size="sidebar" />
        </div>
        <div className="border-b border-gray-200 px-4 py-2 dark:border-[#2a2d3e]">
          <p className="text-sm font-semibold text-[#1a5fb4] dark:text-[#93c5fd]">{portalTitle}</p>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <nav className="flex flex-col gap-1 p-2">
            {nav.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const isAi = item.href.includes('/chatbot') || item.href.includes('/ai-assistant')
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md border-l-[3px] border-transparent px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'border-l-[#1a5fb4] bg-[#1a5fb4]/10 font-medium text-[#1a5fb4] dark:bg-[#1e3a5f] dark:text-[#e8eefc]'
                        : isAi
                          ? 'text-[#e05a00] hover:bg-[#e05a00]/10 dark:hover:bg-[#e05a00]/15'
                          : 'text-gray-600 hover:bg-[#1a5fb4]/10 hover:text-gray-900 dark:text-[#9ca3af] dark:hover:bg-[#1e2130] dark:hover:text-white'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {item.iconSrc ? (
                        <img
                          src={item.iconSrc}
                          alt={item.iconAlt ?? ''}
                          className="h-[18px] w-[18px] shrink-0 dark:invert"
                          width={18}
                          height={18}
                        />
                      ) : null}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="rounded bg-[#e05a00] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  {(item.href.includes('/chatbot') || item.href.includes('/admin/ai-assistant')) && (
                    <div className="my-1 border-t border-gray-200/70 dark:border-[#2a2d3e]" />
                  )}
                </div>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white px-2 py-2 dark:border-[#2a2d3e] dark:bg-[#1a1d27] md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {nav.map(item => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'border-[#1a5fb4] bg-[#1a5fb4]/10 text-[#1a5fb4] dark:bg-[#1e3a5f] dark:text-[#e8eefc]'
                    : 'border-gray-200 text-gray-600 dark:border-[#2a2d3e] dark:text-[#9ca3af]'
                )}
              >
                {item.iconSrc ? (
                  <img
                    src={item.iconSrc}
                    alt=""
                    className="h-3.5 w-3.5 shrink-0 dark:invert"
                    width={14}
                    height={14}
                  />
                ) : null}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <header className="flex min-h-[56px] items-center justify-between border-b border-gray-200 bg-white px-4 py-2 transition-colors dark:border-[#2a2d3e] dark:bg-[#1a1d27]">
          <div className="flex items-center gap-3 md:hidden">
            <PmuLogo size="mobile" alt="" />
            <span className="text-sm font-semibold text-[#1a5fb4] dark:text-[#93c5fd]">{portalTitle}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <span className="hidden max-w-[200px] truncate text-sm text-gray-600 dark:text-[#9ca3af] sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-gray-200 bg-white dark:border-[#2a2d3e] dark:bg-[#1e2130] dark:text-white"
              onClick={() => {
                void logout().then(() => {
                  window.location.href = '/login'
                })
              }}
            >
              <img
                src="/img/logout.svg"
                alt=""
                className="h-4 w-4 shrink-0 dark:invert"
                width={16}
                height={16}
              />
              Logout
            </Button>
          </div>
        </header>
        <main className="page-fade-in flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
