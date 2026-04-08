'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserPlus, ToggleLeft, Download } from 'lucide-react'
import { toast } from 'sonner'

type Stats = {
  totalStudents: number
  totalFaculty: number
  activeRegistrations: number
  openCourses: number
}

type RegInfo = {
  semester: string
  isOpen: boolean
  startDate: string
  endDate: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [registration, setRegistration] = useState<RegInfo | null>(null)

  useEffect(() => {
    void (async () => {
      const r = await fetch('/api/admin/dashboard')
      const d = await r.json()
      if (r.ok) {
        setStats(d.stats)
        setRegistration(d.registration)
      }
    })()
  }, [])

  const exportData = async () => {
    try {
      const r = await fetch('/api/admin/users')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const blob = new Blob([JSON.stringify(d.users, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `pmu-users-export.json`
      a.click()
      toast.success('Export started')
    } catch {
      toast.error('Export failed')
    }
  }

  if (!stats || !registration) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  const endY = registration.endDate
    ? new Date(registration.endDate + 'T12:00:00').getFullYear()
    : new Date().getFullYear()
  const periodLabel = `${formatDateLabel(registration.startDate)} – ${formatDateLabel(registration.endDate)}, ${endY}`

  return (
    <div className="page-fade-in space-y-6">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-[#1a5fb4] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              Total Students
              <span aria-hidden className="text-lg">
                👥
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{stats.totalStudents}</CardContent>
        </Card>
        <Card className="border-t-4 border-t-[#15803d] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              Total Faculty
              <span aria-hidden className="text-lg">
                🎓
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{stats.totalFaculty}</CardContent>
        </Card>
        <Card className="border-t-4 border-t-[#e05a00] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              Active Registrations
              <span aria-hidden className="text-lg">
                📝
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{stats.activeRegistrations}</CardContent>
        </Card>
        <Card className="border-t-4 border-t-[#7c3aed] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              Open Courses
              <span aria-hidden className="text-lg">
                📚
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{stats.openCourses}</CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild className="bg-[#1a5fb4] text-white hover:bg-[#154a96]">
            <Link href="/admin/users" className="inline-flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Activate User
            </Link>
          </Button>
          <Button asChild className="bg-[#e05a00] text-white hover:bg-[#c94f00]">
            <Link href="/admin/registration-control" className="inline-flex items-center gap-2">
              <ToggleLeft className="h-4 w-4" />
              Open/Close Registration
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#1a5fb4] text-[#1a5fb4]"
            onClick={() => void exportData()}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button asChild className="bg-[#e05a00] text-white hover:bg-[#c94f00]">
            <Link href="/admin/ai-assistant">🤖 AI Assistant</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Registration:</span>
            <Badge className={registration.isOpen ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-red-600 text-white hover:bg-red-600'}>
              {registration.isOpen ? 'OPEN' : 'CLOSED'}
            </Badge>
          </div>
          <p>
            <span className="text-muted-foreground">Current Semester:</span>{' '}
            <strong className="text-[#1a5fb4]">{registration.semester}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Registration Period:</span> {periodLabel}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function formatDateLabel(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
