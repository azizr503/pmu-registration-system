"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  currentPage?: string
  onNavigate?: (page: string) => void
  onClose?: () => void
}

interface MenuItem {
  iconSrc: string
  label: string
  href?: string
  subItems?: string[]
}

const menuItems: MenuItem[] = [
  { iconSrc: "/img/home.svg", label: "Dashboard", href: "/" },
  { iconSrc: "/img/book-open.svg", label: "Course Catalog", href: "/courses" },
  { iconSrc: "/img/calendar.svg", label: "My Schedule", href: "/schedule" },
  { iconSrc: "/img/user.svg", label: "My Profile", href: "/profile" },
  { iconSrc: "/img/file-text.svg", label: "Student Records" },
  { iconSrc: "/img/credit-card.svg", label: "Student Accounts" },
  { iconSrc: "/img/file-text.svg", label: "eForms" },
  { iconSrc: "/img/alert-triangle.svg", label: "Student Additional Information" },
  { iconSrc: "/img/calendar.svg", label: "Banner Events" },
  { iconSrc: "/img/clock.svg", label: "Courses Without Conflict" },
]

export function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const getActiveLabel = (path: string) => {
    if (path === "/") return "Dashboard"
    if (path === "/courses") return "Course Catalog"
    if (path === "/schedule") return "My Schedule"
    if (path === "/profile") return "My Profile"
    return "Dashboard"
  }

  const activeItem = getActiveLabel(pathname)

  const toggleExpand = (label: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(label)) {
      newExpanded.delete(label)
    } else {
      newExpanded.add(label)
    }
    setExpandedItems(newExpanded)
  }

  const handleItemClick = (item: MenuItem) => {
    if (item.subItems && !isCollapsed) {
      toggleExpand(item.label)
    }
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          "flex flex-col shadow-sm",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-16" : "w-64",
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-end px-2 py-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close sidebar"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <span className="text-xl leading-none">×</span>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map(item => {
              const isExpanded = expandedItems.has(item.label)
              const isActive = activeItem === item.label

              const buttonContent = (
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full gap-3 px-3 py-2.5 h-auto text-sm font-medium transition-all relative",
                    isCollapsed ? "justify-center" : "justify-start",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  onClick={() => handleItemClick(item)}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {isActive && !isCollapsed && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-pmu-blue rounded-r-full" />
                  )}
                  <img
                    src={item.iconSrc}
                    alt=""
                    className={cn("h-4 w-4 shrink-0 dark:invert", isActive && "opacity-100")}
                    width={16}
                    height={16}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.subItems &&
                        (isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        ))}
                    </>
                  )}
                </Button>
              )

              return (
                <div key={item.label}>
                  {item.href ? <Link href={item.href}>{buttonContent}</Link> : buttonContent}
                  {item.subItems && isExpanded && !isCollapsed && (
                    <div className="ml-9 mt-1 space-y-1">
                      {item.subItems.map(subItem => (
                        <Button
                          key={subItem}
                          variant="ghost"
                          className="w-full justify-start px-3 py-2 h-auto text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                        >
                          {subItem}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
