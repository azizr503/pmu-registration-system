'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function FacultyDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/faculty/overview')
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        setData(d)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  if (!data) return <p className="text-destructive">Unable to load faculty dashboard.</p>

  const sections = data.sections as {
    id: string
    code: string
    title: string
    enrolled_count: number
    capacity: number
  }[]
  const stats = data.stats as { coursesThisSemester: number; totalStudents: number; pendingGradeSubmissions: number }
  const semester = data.semester as string
  const facultyName = (data.facultyName as string) || 'Faculty'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a5fb4]">
          {facultyName} — You have {stats.coursesThisSemester} active courses this semester ({semester})
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{stats.totalStudents}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Courses This Semester</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{stats.coursesThisSemester}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Grade Submissions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#e05a00]">{stats.pendingGradeSubmissions}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(s => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {s.code} — {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Enrolled: {s.enrolled_count} / {s.capacity}
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={`/faculty/roster/${s.id}`} className="text-[#1a5fb4] underline">
                  View roster
                </Link>
                <Link href={`/faculty/grades/${s.id}`} className="text-[#1a5fb4] underline">
                  Submit grades
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
