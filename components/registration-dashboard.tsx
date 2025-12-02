"use client"

import { useState } from "react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { DashboardContent } from "./dashboard-content"
import { AIChatbot } from "./ai-chatbot"

export function RegistrationDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState("dashboard")

  return (
    <div className="min-h-screen flex flex-col bg-pmu-gray">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isCollapsed={sidebarCollapsed}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />
        <main className="flex-1 overflow-y-auto bg-pmu-gray">
          <DashboardContent />
        </main>
      </div>
      <AIChatbot />
    </div>
  )
}
