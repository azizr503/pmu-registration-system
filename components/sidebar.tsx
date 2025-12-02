"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  User,
  BookOpen,
  FileText,
  CreditCard,
  FileCheck,
  Info,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Home,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  currentPage?: string
  onNavigate?: (page: string) => void
}

interface MenuItem {
  icon: React.ElementType
  label: string
  href?: string
  subItems?: string[]
}

const menuItems: MenuItem[] = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: BookOpen, label: "Course Catalog", href: "/courses" },
  { icon: GraduationCap, label: "My Schedule", href: "/schedule" },
  { icon: User, label: "My Profile", href: "/profile" },
  { icon: FileText, label: "Student Records" },
  { icon: CreditCard, label: "Student Accounts" },
  { icon: FileCheck, label: "eForms" },
  { icon: Info, label: "Student Additional Information" },
  { icon: Calendar, label: "Banner Events" },
  { icon: Clock, label: "Courses Without Conflict" },
]

export function Sidebar({ isOpen, isCollapsed }: SidebarProps) {
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
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => {}} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          "flex flex-col shadow-sm",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-16" : "w-64",
        )}
        aria-label="Main navigation"
      >
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon
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
                  <Icon className={cn(
                    "h-4 w-4 shrink-0",
                    isActive && "text-pmu-blue"
                  )} />
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
                      {item.subItems.map((subItem) => (
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
