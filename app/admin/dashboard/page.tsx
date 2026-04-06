'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    void (async () => {
      const r = await fetch('/api/admin/dashboard')
      const d = await r.json()
      if (r.ok) setStats(d.stats)
    })()
  }, [])

  if (!stats) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalStudents}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Faculty</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalFaculty}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Registrations</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.activeRegistrations}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Open Courses (sections)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.openCourses}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild className="bg-[#1a5fb4]">
          <Link href="/admin/users">Activate User</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/registration-control">Open/Close Registration</Link>
        </Button>
        <Button variant="secondary" onClick={() => window.alert('Export demo — wire to CSV endpoint')}>
          Export Data
        </Button>
      </div>
    </div>
  )
}
