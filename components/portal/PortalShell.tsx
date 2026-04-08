'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { LogOut } from 'lucide-react'

export type PortalNavItem = { href: string; label: string; badge?: string }

type Props = {
  portalTitle: string
  nav: PortalNavItem[]
  children: React.ReactNode
}

export function PortalShell({ portalTitle, nav, children }: Props) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-1 bg-[#f4f6f9]">
      <aside className="hidden w-[220px] shrink-0 border-r border-border bg-white md:block">
        <div className="flex min-h-[72px] items-center border-b border-border px-4 py-2">
          <img
            src="/img/pmulogo.png"
            alt="PMU"
            className="h-[60px] max-h-[60px] w-auto max-w-[200px] shrink-0 object-contain"
          />
        </div>
        <div className="border-b border-border px-4 py-2">
          <p className="text-sm font-semibold text-[#1a5fb4]">{portalTitle}</p>
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
                      'flex items-center justify-between rounded-md border-l-[3px] border-transparent px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'border-l-[#1a5fb4] bg-[#1a5fb4]/10 font-medium text-[#1a5fb4]'
                        : isAi
                          ? 'text-[#e05a00] hover:bg-[#e05a00]/10'
                          : 'text-muted-foreground hover:bg-[#1a5fb4]/10 hover:text-foreground'
                    )}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="rounded bg-[#e05a00] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  {(item.href.includes('/chatbot') || item.href.includes('/admin/ai-assistant')) && (
                    <div className="my-1 border-t border-border/70" />
                  )}
                </div>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-white px-2 py-2 md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {nav.map(item => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-full border px-2.5 py-1',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'border-[#1a5fb4] bg-[#1a5fb4]/10 text-[#1a5fb4]'
                    : 'border-border text-muted-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <header className="flex min-h-[56px] items-center justify-between border-b border-border bg-white px-4 py-2">
          <div className="flex items-center gap-3 md:hidden">
            <img
              src="/img/pmulogo.png"
              alt=""
              className="h-10 max-h-[60px] w-auto max-w-[160px] shrink-0 object-contain"
            />
            <span className="text-sm font-semibold text-[#1a5fb4]">{portalTitle}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-[200px] truncate text-sm text-muted-foreground sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                void logout().then(() => {
                  window.location.href = '/login'
                })
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>
        <main className="page-fade-in flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
