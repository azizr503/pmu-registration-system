"use client"

import type React from "react"

import { useState } from "react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { AIChatbot } from "./ai-chatbot"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-pmu-gray">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isCollapsed={sidebarCollapsed}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} isCollapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-y-auto bg-pmu-gray">{children}</main>
      </div>
      <AIChatbot />
    </div>
  )
}
