"use client"

import { Menu, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface HeaderProps {
  onMenuClick: () => void
  onToggleCollapse: () => void
  isCollapsed: boolean
}

export function Header({ onMenuClick, onToggleCollapse, isCollapsed }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-pmu-blue text-pmu-white shadow-md sticky top-0 z-40 border-b border-pmu-blue/20">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 h-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-pmu-white hover:bg-pmu-blue/90 h-9 w-9"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden lg:flex text-pmu-white hover:bg-pmu-blue/90 h-9 w-9"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" aria-label="Home">
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold leading-tight">
                <span className="text-pmu-white">Prince Mohammad Bin Fahd </span>
                <span className="text-pmu-white font-bold">PMU</span>
              </h1>
              <p className="text-sm text-pmu-gold font-medium">Student Registration System</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-pmu-white/20">
                    <AvatarFallback className="bg-pmu-white text-pmu-blue font-semibold">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-pmu-blue">{user.firstName} {user.lastName}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs text-pmu-gold font-medium">
                      Student ID: {user.studentId}
                    </p>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <img src="/img/user.svg" alt="" className="mr-2 h-4 w-4 shrink-0 dark:invert" width={16} height={16} />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer">
                    <img src="/img/settings.svg" alt="" className="mr-2 h-4 w-4 shrink-0 dark:invert" width={16} height={16} />
                    Admin Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <img src="/img/logout.svg" alt="" className="mr-2 h-4 w-4 shrink-0 dark:invert" width={16} height={16} />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="border-pmu-white text-pmu-white hover:bg-pmu-white hover:text-pmu-blue">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm" className="bg-pmu-gold text-pmu-white hover:bg-pmu-gold-dark">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
